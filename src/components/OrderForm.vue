<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, nextTick, ref, watch } from 'vue'

import { useAccount } from '@/composables/useAccount'
import { api, describeError, type ExchangeEvent, type Market, type Outcome, type Side } from '@/lib/api'
import { cents, complement, notional, outcomeName, PRICE_SCALE, shares, toPrice, toQty, UNIT, usdc } from '@/lib/units'

const props = defineProps<{ market: Market; bestBid: number | null; bestAsk: number | null }>()
const outcome = defineModel<Outcome>('outcome', { required: true })
const priceCents = defineModel<number | null>('price', { required: true })

const { account, apiKey } = useAccount()
const queryClient = useQueryClient()

const side = ref<Side>('buy')
const kind = ref<'limit' | 'market'>('limit')
const amount = ref<number | null>(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')

const open = computed(() => props.market.status === 'open')
const tickCents = computed(() => props.market.tick / 100)
const lotShares = computed(() => props.market.lot / UNIT)

// Best price you would get right now for each outcome, per side, translated out of YES-price space.
const quotes = computed(() => {
  const { bestBid: bid, bestAsk: ask } = props
  const flip = (p: number | null) => (p === null ? null : complement(p))
  return side.value === 'buy' ? { yes: ask, no: flip(bid) } : { yes: bid, no: flip(ask) }
})

// Start the price field at the going rate once the book is known, but never overwrite what the user typed.
let seeded = false
watch(
  () => quotes.value[outcome.value],
  (quote) => {
    if (seeded || quote === null) return
    seeded = true
    if (priceCents.value === null) priceCents.value = quote / 100
  },
  { immediate: true },
)

function choose(next: Outcome) {
  outcome.value = next
  const quote = quotes.value[next]
  if (kind.value === 'limit' && quote !== null) priceCents.value = quote / 100
}

// A market order is sent as fill-and-kill at the worst price the market allows.
const price = computed(() => {
  if (kind.value === 'market') return side.value === 'buy' ? PRICE_SCALE - props.market.tick : props.market.tick
  return priceCents.value === null ? null : toPrice(priceCents.value, props.market.tick)
})
const qty = computed(() => (amount.value === null ? null : toQty(amount.value, props.market.lot)))

const held = computed(
  () =>
    account.value?.positions.find((p) => p.market === props.market.market && p.outcome === outcome.value)?.available ??
    0,
)

const total = computed(() => (price.value === null || qty.value === null ? null : notional(price.value, qty.value)))

const problem = computed(() => {
  if (!open.value) return 'This market is not taking orders.'
  if (!apiKey.value) return 'Sign in to place an order.'
  if (kind.value === 'limit' && priceCents.value !== null && price.value === null)
    return `Price must be between ${cents(props.market.tick)} and ${cents(PRICE_SCALE - props.market.tick)}.`
  if (amount.value !== null && qty.value === null) return `Minimum amount is ${lotShares.value} shares.`
  if (!account.value || total.value === null || qty.value === null) return ''
  if (side.value === 'buy' && total.value > account.value.usdc.available) return "You don't have enough USDC."
  if (side.value === 'sell' && qty.value > held.value) return "You don't have enough shares."
  return ''
})
const potential = computed(() =>
  side.value === 'buy' && qty.value !== null && total.value !== null ? qty.value - total.value : null,
)
const ready = computed(() => !problem.value && price.value !== null && qty.value !== null && !busy.value)
const name = computed(() => outcomeName(outcome.value))
const action = computed(() => `${side.value === 'buy' ? 'Buy' : 'Sell'} ${name.value}`)

watch([side, kind, outcome, amount, priceCents], () => {
  error.value = ''
  notice.value = ''
})

function summarize(events: ExchangeEvent[]): string {
  let filled = 0
  let cost = 0
  let resting = 0
  let cancelled = 0
  for (const event of events) {
    if ('trade' in event) {
      const own = outcome.value === 'yes' ? event.trade.yes_price : PRICE_SCALE - event.trade.yes_price
      filled += event.trade.qty
      cost += notional(own, event.trade.qty)
    } else if ('rested' in event) resting = event.rested.remaining
    else if ('cancelled' in event && event.cancelled.account === account.value?.account)
      cancelled = event.cancelled.remaining
  }
  const parts: string[] = []
  if (filled) parts.push(`Filled ${shares(filled)} shares at an average of ${cents(Math.round((cost / filled) * PRICE_SCALE))}`)
  if (resting) parts.push(`${shares(resting)} shares waiting on the order book`)
  if (cancelled) parts.push(`${shares(cancelled)} shares went unfilled and were cancelled`)
  return parts.length ? `${parts.join('. ')}.` : 'Order placed.'
}

async function submit() {
  if (!ready.value || !apiKey.value || price.value === null || qty.value === null) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await api.placeOrder(apiKey.value, {
      market: props.market.market,
      side: side.value,
      outcome: outcome.value,
      price: price.value,
      qty: qty.value,
      tif: kind.value === 'market' ? 'fak' : 'gtc',
    })
    amount.value = null
    // Clearing the amount triggers the watcher that wipes messages; let it run first.
    await nextTick()
    notice.value = summarize(result.events)
    queryClient.invalidateQueries({ queryKey: ['account'] })
  } catch (e) {
    error.value = describeError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="rounded-2xl border border-line bg-card p-5" aria-label="Place an order" @submit.prevent="submit">
    <div class="grid grid-cols-2 gap-1 rounded-[12px] bg-page p-1 text-[14px] font-semibold" role="tablist">
      <button
        v-for="option in (['buy', 'sell'] as const)"
        :key="option"
        type="button"
        role="tab"
        :aria-selected="side === option"
        class="rounded-[9px] py-2"
        :class="side === option ? 'bg-card text-ink shadow-[0_1px_2px_rgb(18_26_44/0.12)]' : 'text-muted hover:text-ink'"
        @click="side = option"
      >
        {{ option === 'buy' ? 'Buy' : 'Sell' }}
      </button>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        v-for="option in (['yes', 'no'] as const)"
        :key="option"
        type="button"
        :aria-pressed="outcome === option"
        class="rounded-[12px] border-2 px-3 py-2.5 text-left transition-colors"
        :class="
          outcome === option
            ? option === 'yes'
              ? 'border-yes-ink bg-yes-ink text-white'
              : 'border-no-ink bg-no-ink text-white'
            : option === 'yes'
              ? 'border-transparent bg-yes/10 text-yes-ink hover:border-yes/40'
              : 'border-transparent bg-no/10 text-no-ink hover:border-no/40'
        "
        @click="choose(option)"
      >
        <span class="block text-[13px] font-semibold">{{ outcomeName(option) }}</span>
        <span class="block text-[20px] leading-tight font-bold">{{ quotes[option] === null ? '–' : cents(quotes[option]!) }}</span>
      </button>
    </div>

    <div class="mt-5 flex items-center justify-between">
      <span class="text-[14px] font-semibold">Order type</span>
      <div class="flex gap-1 text-[13px] font-semibold">
        <button
          v-for="option in (['limit', 'market'] as const)"
          :key="option"
          type="button"
          :aria-pressed="kind === option"
          class="rounded-[8px] px-2.5 py-1"
          :class="kind === option ? 'bg-ink text-white' : 'text-muted hover:bg-page hover:text-ink'"
          @click="kind = option"
        >
          {{ option === 'limit' ? 'Limit' : 'Market' }}
        </button>
      </div>
    </div>

    <label v-if="kind === 'limit'" class="mt-3 block">
      <span class="text-[13px] font-semibold text-muted">Limit price</span>
      <span class="mt-1 flex items-center rounded-[10px] border border-line focus-within:border-brand">
        <input
          v-model.number="priceCents"
          type="number"
          inputmode="decimal"
          :min="tickCents"
          :max="100 - tickCents"
          :step="tickCents"
          class="w-full bg-transparent px-3 py-2.5 text-[16px] font-semibold outline-none"
        />
        <span class="pr-3 text-muted">¢</span>
      </span>
    </label>
    <p v-else class="mt-3 rounded-[10px] bg-page px-3 py-2 text-[13px] text-muted">
      Fills right away at the best available prices. Anything that can't fill is cancelled.
    </p>

    <label class="mt-3 block">
      <span class="flex items-baseline justify-between text-[13px] font-semibold text-muted">
        <span>Shares</span>
        <button
          v-if="side === 'sell' && held"
          type="button"
          class="font-semibold text-brand hover:underline"
          @click="amount = held / UNIT"
        >
          Max {{ shares(held) }}
        </button>
      </span>
      <span class="mt-1 flex items-center rounded-[10px] border border-line focus-within:border-brand">
        <input
          v-model.number="amount"
          type="number"
          inputmode="decimal"
          min="0"
          :step="lotShares"
          placeholder="0"
          class="w-full bg-transparent px-3 py-2.5 text-[16px] font-semibold outline-none placeholder:text-muted/50"
        />
        <span class="pr-3 text-muted">shares</span>
      </span>
    </label>

    <dl class="mt-5 space-y-2 border-t border-line pt-4 text-[14px]">
      <div class="flex justify-between">
        <dt class="text-muted">
          {{
            side === 'buy'
              ? kind === 'market'
                ? 'You pay at most'
                : 'You pay'
              : kind === 'market'
                ? 'You receive at least'
                : 'You receive'
          }}
        </dt>
        <dd class="font-bold">{{ total === null ? '–' : usdc(total) }}</dd>
      </div>
      <div v-if="side === 'buy'" class="flex justify-between">
        <dt class="text-muted">Potential profit</dt>
        <dd class="font-bold text-yes-ink">{{ potential === null ? '–' : `+${usdc(potential)}` }}</dd>
      </div>
    </dl>

    <button
      type="submit"
      :disabled="!ready"
      class="mt-5 w-full rounded-[12px] py-3 text-[15px] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
      :class="outcome === 'yes' ? 'bg-yes-ink' : 'bg-no-ink'"
    >
      {{ busy ? 'Placing order…' : action }}
    </button>

    <p v-if="problem" class="mt-3 text-center text-[13px] text-muted">{{ problem }}</p>
    <p v-if="error" class="mt-3 rounded-[10px] bg-no/10 px-3 py-2 text-[13px] font-semibold text-no-ink" role="alert">{{ error }}</p>
    <p v-if="notice" class="mt-3 rounded-[10px] bg-yes/10 px-3 py-2 text-[13px] font-semibold text-yes-ink" role="status">
      {{ notice }}
    </p>
  </form>
</template>
