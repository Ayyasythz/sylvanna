<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import type { TradeTick } from '@/composables/useMarketFeed'
import { api, ApiError, type Candle, type CandleInterval, type Outcome } from '@/lib/api'
import { PRICE_SCALE, UNIT } from '@/lib/units'

const props = defineProps<{ market: number; trades: TradeTick[] }>()

const INTERVALS: { value: CandleInterval; label: string; ms: number }[] = [
  { value: '1m', label: '1m', ms: 60_000 },
  { value: '5m', label: '5m', ms: 5 * 60_000 },
  { value: '15m', label: '15m', ms: 15 * 60_000 },
  { value: '1h', label: '1h', ms: 3_600_000 },
  { value: '4h', label: '4h', ms: 4 * 3_600_000 },
  { value: '1d', label: '1D', ms: 86_400_000 },
]
const MAX_BARS = 1500
const VISIBLE_BARS = 120
const COLORS = {
  yes: '#14a150',
  no: '#e5484d',
  grid: '#eef0f3',
  text: '#5d687a',
  line: '#e3e6eb',
  ink: '#121a2c',
}

const interval = ref(INTERVALS[2]!)
const style = ref<'candles' | 'line'>('candles')
const outcome = ref<Outcome>('yes')

const query = useQuery({
  queryKey: computed(() => ['candles', props.market, interval.value.value, 'chart']),
  queryFn: () => api.candles(props.market, interval.value.value, 1000),
  refetchInterval: 60_000,
  retry: (count, error) => !(error instanceof ApiError && error.status === 503) && count < 2,
})

interface Bar {
  start: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// The server only stores buckets that had trades; a prediction market's price
// holds between trades, so empty buckets are drawn flat at the last close.
function fill(candles: Candle[], step: number): Bar[] {
  const sorted = [...candles].sort((a, b) => a.start - b.start)
  if (!sorted.length) return []
  const bars: Bar[] = []
  const end = Math.floor(Date.now() / step) * step
  let next = sorted[0]!.start
  for (const candle of sorted) {
    const prev = bars.at(-1)
    for (; prev && next < candle.start; next += step) {
      bars.push({ start: next, open: prev.close, high: prev.close, low: prev.close, close: prev.close, volume: 0 })
    }
    bars.push({ ...candle })
    next = candle.start + step
  }
  for (const last = bars.at(-1)!; next <= end; next += step) {
    bars.push({ start: next, open: last.close, high: last.close, low: last.close, close: last.close, volume: 0 })
  }
  return bars.slice(-MAX_BARS)
}

const bars = shallowRef<Bar[]>([])
watch(
  () => query.data.value,
  (candles) => {
    bars.value = fill(candles ?? [], interval.value.ms)
    render(true)
  },
)

// Shifted by the local UTC offset because the library always labels the time axis in UTC.
const offset = new Date().getTimezoneOffset() * 60_000
const toTime = (ms: number) => ((ms - offset) / 1000) as UTCTimestamp

function view(bar: Bar) {
  const flip = outcome.value === 'no'
  const p = (bps: number) => (flip ? PRICE_SCALE - bps : bps) / 100
  return {
    time: toTime(bar.start),
    open: p(bar.open),
    high: p(flip ? bar.low : bar.high),
    low: p(flip ? bar.high : bar.low),
    close: p(bar.close),
    volume: bar.volume / UNIT,
  }
}

const container = ref<HTMLDivElement>()
let chart: IChartApi | undefined
let price: ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | undefined
let volume: ISeriesApi<'Histogram'> | undefined

const accent = computed(() => (outcome.value === 'yes' ? COLORS.yes : COLORS.no))
const volumeColor = (up: boolean, v: number) => (v === 0 ? 'rgba(0,0,0,0)' : up ? 'rgba(20,161,80,0.35)' : 'rgba(229,72,77,0.35)')

function createPriceSeries() {
  if (!chart) return
  if (price) chart.removeSeries(price)
  const priceFormat = {
    type: 'custom' as const,
    minMove: 0.1,
    formatter: (p: number) => `${Number(p.toFixed(1))}¢`,
  }
  price =
    style.value === 'candles'
      ? chart.addSeries(CandlestickSeries, {
          upColor: COLORS.yes,
          downColor: COLORS.no,
          wickUpColor: COLORS.yes,
          wickDownColor: COLORS.no,
          borderUpColor: COLORS.yes,
          borderDownColor: COLORS.no,
          priceFormat,
        })
      : chart.addSeries(AreaSeries, {
          lineColor: accent.value,
          topColor: outcome.value === 'yes' ? 'rgba(20,161,80,0.22)' : 'rgba(229,72,77,0.22)',
          bottomColor: 'rgba(255,255,255,0)',
          lineWidth: 2,
          priceFormat,
        })
  price.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.25 } })
}

function render(resetRange = false) {
  if (!chart || !price || !volume) return
  const data = bars.value.map(view)
  if (style.value === 'candles') {
    ;(price as ISeriesApi<'Candlestick'>).setData(data)
  } else {
    ;(price as ISeriesApi<'Area'>).setData(data.map((d) => ({ time: d.time, value: d.close })))
  }
  volume.setData(data.map((d) => ({ time: d.time, value: d.volume, color: volumeColor(d.close >= d.open, d.volume) })))
  if (resetRange) resetZoom()
}

function resetZoom() {
  const n = bars.value.length
  if (!chart || !n) return
  chart.timeScale().setVisibleLogicalRange({ from: Math.max(-2, n - VISIBLE_BARS), to: n + 4 })
}

// Fold each live trade into the newest bar so the chart moves without waiting for the history database.
watch(
  () => props.trades[0],
  (trade) => {
    if (!trade || !trade.key.includes(':live:') || !bars.value.length) return
    const step = interval.value.ms
    const start = Math.floor(trade.ts / step) * step
    const list = [...bars.value]
    let last = list.at(-1)!
    while (last.start < start) {
      last = { start: last.start + step, open: last.close, high: last.close, low: last.close, close: last.close, volume: 0 }
      list.push(last)
    }
    if (last.start !== start) return
    list[list.length - 1] = {
      ...last,
      high: Math.max(last.high, trade.yesPrice),
      low: Math.min(last.low, trade.yesPrice),
      close: trade.yesPrice,
      volume: last.volume + trade.qty,
    }
    bars.value = list.slice(-MAX_BARS)
    render()
  },
)

const hovered = ref<ReturnType<typeof view> | null>(null)
const legend = computed(() => hovered.value ?? (bars.value.length ? view(bars.value.at(-1)!) : null))
const legendChange = computed(() => {
  const bar = legend.value
  if (!bar) return null
  const diff = bar.close - bar.open
  return { diff, pct: bar.open ? (diff / bar.open) * 100 : 0 }
})

const byTime = computed(() => new Map(bars.value.map((b) => [toTime(b.start) as number, b])))

function onCrosshair(param: MouseEventParams<Time>) {
  const point = price && param.seriesData.get(price)
  const bar = point ? byTime.value.get(point.time as number) : undefined
  hovered.value = bar ? view(bar) : null
}

onMounted(() => {
  chart = createChart(container.value!, {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: '#ffffff' },
      textColor: COLORS.text,
      fontFamily: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif",
      fontSize: 12,
      attributionLogo: true,
    },
    grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
    rightPriceScale: { borderColor: COLORS.line },
    timeScale: { borderColor: COLORS.line, timeVisible: true, secondsVisible: false, rightOffset: 4 },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#9aa3b2', labelBackgroundColor: COLORS.ink },
      horzLine: { color: '#9aa3b2', labelBackgroundColor: COLORS.ink },
    },
  })
  volume = chart.addSeries(HistogramSeries, { priceScaleId: 'volume', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false })
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
  createPriceSeries()
  chart.subscribeCrosshairMove(onCrosshair)
  bars.value = fill(query.data.value ?? [], interval.value.ms)
  render(true)
})

onBeforeUnmount(() => {
  chart?.unsubscribeCrosshairMove(onCrosshair)
  chart?.remove()
  chart = undefined
})

watch(style, () => {
  createPriceSeries()
  render()
})
watch(outcome, () => {
  createPriceSeries()
  render()
})
watch(interval, () => {
  bars.value = fill(query.data.value ?? [], interval.value.ms)
  render(true)
})

const disabled = computed(() => query.error.value instanceof ApiError && query.error.value.status === 503)
const empty = computed(() => !bars.value.length)
const cents = (p: number) => `${Number(p.toFixed(1))}¢`
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex gap-0.5" role="group" aria-label="Candle interval">
        <button
          v-for="option in INTERVALS"
          :key="option.value"
          class="rounded-[7px] px-2 py-1 text-[13px] font-semibold"
          :class="interval.value === option.value ? 'bg-ink text-white' : 'text-muted hover:bg-page hover:text-ink'"
          :aria-pressed="interval.value === option.value"
          @click="interval = option"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex gap-0.5 rounded-[9px] bg-page p-0.5" role="group" aria-label="Chart style">
          <button
            class="rounded-[7px] p-1.5"
            :class="style === 'candles' ? 'bg-card text-ink shadow-[0_1px_2px_rgb(18_26_44/0.12)]' : 'text-muted hover:text-ink'"
            :aria-pressed="style === 'candles'"
            title="Candles"
            @click="style = 'candles'"
          >
            <svg viewBox="0 0 20 20" class="size-4 fill-current" aria-hidden="true">
              <path d="M6 2h1.5v3H9v9H7.5v4H6v-4H4.5V5H6V2Zm7.5 3H15v3h1.5v6H15v4h-1.5v-4H12V8h1.5V5Z" />
            </svg>
            <span class="sr-only">Candles</span>
          </button>
          <button
            class="rounded-[7px] p-1.5"
            :class="style === 'line' ? 'bg-card text-ink shadow-[0_1px_2px_rgb(18_26_44/0.12)]' : 'text-muted hover:text-ink'"
            :aria-pressed="style === 'line'"
            title="Line"
            @click="style = 'line'"
          >
            <svg viewBox="0 0 20 20" class="size-4 fill-none stroke-current" stroke-width="1.75" aria-hidden="true">
              <path d="M2.5 14.5 7 9l3.5 3.5 7-8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="sr-only">Line</span>
          </button>
        </div>
        <div class="flex gap-0.5 rounded-[9px] bg-page p-0.5 text-[13px] font-semibold" role="group" aria-label="Price of">
          <button
            class="rounded-[7px] px-2 py-1"
            :class="outcome === 'yes' ? 'bg-card text-yes-ink shadow-[0_1px_2px_rgb(18_26_44/0.12)]' : 'text-muted hover:text-ink'"
            :aria-pressed="outcome === 'yes'"
            @click="outcome = 'yes'"
          >
            Yes
          </button>
          <button
            class="rounded-[7px] px-2 py-1"
            :class="outcome === 'no' ? 'bg-card text-no-ink shadow-[0_1px_2px_rgb(18_26_44/0.12)]' : 'text-muted hover:text-ink'"
            :aria-pressed="outcome === 'no'"
            @click="outcome = 'no'"
          >
            No
          </button>
        </div>
        <button
          class="rounded-[7px] px-2 py-1 text-[13px] font-semibold text-muted hover:bg-page hover:text-ink"
          title="Show the latest bars"
          @click="resetZoom"
        >
          Reset
        </button>
      </div>
    </div>

    <div class="mt-3 min-h-[18px]">
      <div v-if="legend && legendChange" class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px]">
        <span class="font-bold" :class="outcome === 'yes' ? 'text-yes-ink' : 'text-no-ink'">{{ outcome === 'yes' ? 'Yes' : 'No' }}</span>
        <span class="text-muted">{{ interval.label }}</span>
        <span><span class="text-muted">O</span> {{ cents(legend.open) }}</span>
        <span><span class="text-muted">H</span> {{ cents(legend.high) }}</span>
        <span><span class="text-muted">L</span> {{ cents(legend.low) }}</span>
        <span><span class="text-muted">C</span> {{ cents(legend.close) }}</span>
        <span :class="legendChange.diff >= 0 ? 'text-yes-ink' : 'text-no-ink'">
          {{ legendChange.diff >= 0 ? '+' : '' }}{{ legendChange.diff.toFixed(1) }} ({{ legendChange.pct >= 0 ? '+' : '' }}{{ legendChange.pct.toFixed(2) }}%)
        </span>
        <span><span class="text-muted">Vol</span> {{ Number(legend.volume.toFixed(2)) }}</span>
      </div>
    </div>

    <div class="relative mt-2 h-[320px] md:h-[400px]">
      <div ref="container" class="absolute inset-0" />


      <p
        v-if="empty"
        class="absolute inset-0 z-10 grid place-items-center bg-card/80 text-center text-[14px] text-muted"
      >
        {{
          disabled
            ? 'The chart needs trade history, which is turned off on this server.'
            : query.isPending.value
              ? 'Loading chart…'
              : 'No trades yet. The chart starts with the first trade.'
        }}
      </p>
    </div>
  </div>
</template>
