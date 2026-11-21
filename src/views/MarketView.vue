<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, ref, toRef } from 'vue'
import { useRoute } from 'vue-router'

import ImageCredit from '@/components/ImageCredit.vue'
import MarketThumb from '@/components/MarketThumb.vue'
import MyOrders from '@/components/MyOrders.vue'
import OrderBook from '@/components/OrderBook.vue'
import OrderForm from '@/components/OrderForm.vue'
import TradingChart from '@/components/TradingChart.vue'
import RecentTrades from '@/components/RecentTrades.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useMarketFeed } from '@/composables/useMarketFeed'
import { marketTitle, useMarkets, yesChance } from '@/composables/useMarkets'
import { api, ApiError, describeError, type Outcome } from '@/lib/api'
import { dateTime, outcomeName, split } from '@/lib/units'

const props = defineProps<{ id: number }>()
const route = useRoute()

const { data: markets, error, isPending } = useMarkets()
const market = computed(() => markets.value?.find((m) => m.market === props.id))
const { book, trades } = useMarketFeed(toRef(props, 'id'))

const outcome = ref<Outcome>(route.query.outcome === 'no' ? 'no' : 'yes')
const price = ref<number | null>(null)
const tab = ref<'book' | 'trades'>('book')
const day = useQuery({
  queryKey: computed(() => ['candles', props.id, 'day']),
  queryFn: () => api.candles(props.id, '1h', 24),
  refetchInterval: 60_000,
  retry: (count, e) => !(e instanceof ApiError && e.status === 503) && count < 2,
})

// The market list is polled; the book stream is fresher.
const best = computed(() => {
  const live = book.value
  if (live) return { bid: live.bids[0]?.[0] ?? null, ask: live.asks[0]?.[0] ?? null }
  return { bid: market.value?.best_bid ?? null, ask: market.value?.best_ask ?? null }
})
const chance = computed(() =>
  market.value ? yesChance({ status: market.value.status, best_bid: best.value.bid, best_ask: best.value.ask }) : null,
)
const odds = computed(() => (chance.value === null ? null : split(chance.value)))
const points = computed(() => {
  const candles = day.data.value
  if (!candles?.length) return null
  return Math.round((candles[0]!.close - candles.at(-1)!.open) / 100)
})
</script>

<template>
  <RouterLink to="/" class="inline-flex items-center gap-1 text-[14px] font-semibold text-muted hover:text-ink">
    <svg viewBox="0 0 20 20" class="size-4 fill-current" aria-hidden="true">
      <path d="M12.8 4.2a.75.75 0 0 1 0 1.06L8.06 10l4.74 4.74a.75.75 0 1 1-1.06 1.06l-5.27-5.27a.75.75 0 0 1 0-1.06l5.27-5.27a.75.75 0 0 1 1.06 0Z" />
    </svg>
    All markets
  </RouterLink>

  <p v-if="isPending" class="mt-8 text-muted">Loading market…</p>
  <p v-else-if="error && !markets" class="mt-8 text-no-ink" role="alert">{{ describeError(error) }}</p>
  <p v-else-if="!market" class="mt-8 text-muted">Market {{ id }} not found.</p>

  <template v-else>
    <header class="mt-4 flex items-center gap-4">
      <MarketThumb :market="market.market" class="size-16 rounded-[14px] md:size-20 md:rounded-[16px]" />
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <StatusBadge :status="market.status" />
          <span v-if="market.info?.closes_at">Ends {{ dateTime(market.info.closes_at) }}</span>
        </div>
        <h1 class="mt-2 max-w-[40ch] text-[22px] leading-tight font-bold tracking-tight md:text-[30px]">{{ marketTitle(market) }}</h1>
      </div>
    </header>

    <!-- One grid so the ticket sits right under the chart on phones and beside everything on desktop. -->
    <div class="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section class="rounded-2xl border border-line bg-card p-5 lg:col-start-1" aria-label="Chance and chart">
          <div class="flex flex-wrap items-end gap-x-3 gap-y-1">
            <span class="text-[36px] leading-none font-bold tracking-tight">{{ odds?.yes ?? '–' }}</span>
            <span class="pb-1 text-[15px] font-semibold text-muted">chance of {{ outcomeName('yes') }}</span>
            <span
              v-if="points"
              class="mb-1 rounded-[6px] px-1.5 py-0.5 text-[13px] font-bold"
              :class="points > 0 ? 'bg-yes/10 text-yes-ink' : 'bg-no/10 text-no-ink'"
            >
              {{ points > 0 ? '▲' : '▼' }} {{ Math.abs(points) }} {{ Math.abs(points) === 1 ? 'pt' : 'pts' }} in the last 24h
            </span>
          </div>
          <TradingChart class="mt-5" :market="market.market" :trades="trades" />
        </section>

        <aside class="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <OrderForm
            v-model:outcome="outcome"
            v-model:price="price"
            :market="market"
            :best-bid="best.bid"
            :best-ask="best.ask"
          />
          <MyOrders :market="market.market" />
        </aside>

        <section class="rounded-2xl border border-line bg-card p-5 lg:col-start-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-5 text-[15px] font-bold" role="tablist">
              <button
                role="tab"
                :aria-selected="tab === 'book'"
                class="border-b-2 pb-1"
                :class="tab === 'book' ? 'border-ink' : 'border-transparent text-muted hover:text-ink'"
                @click="tab = 'book'"
              >
                Order book
              </button>
              <button
                role="tab"
                :aria-selected="tab === 'trades'"
                class="border-b-2 pb-1"
                :class="tab === 'trades' ? 'border-ink' : 'border-transparent text-muted hover:text-ink'"
                @click="tab = 'trades'"
              >
                Trades
              </button>
            </div>
            <div class="flex gap-1 text-[13px] font-semibold" role="group" aria-label="Show prices for">
              <button
                class="rounded-[8px] px-2.5 py-1"
                :class="outcome === 'yes' ? 'bg-yes/10 text-yes-ink' : 'text-muted hover:text-ink'"
                :aria-pressed="outcome === 'yes'"
                @click="outcome = 'yes'"
              >
                Yes shares
              </button>
              <button
                class="rounded-[8px] px-2.5 py-1"
                :class="outcome === 'no' ? 'bg-no/10 text-no-ink' : 'text-muted hover:text-ink'"
                :aria-pressed="outcome === 'no'"
                @click="outcome = 'no'"
              >
                No shares
              </button>
            </div>
          </div>
          <div class="mt-4">
            <OrderBook v-if="tab === 'book'" :book="book" :outcome="outcome" @pick="price = $event / 100" />
            <RecentTrades v-else :trades="trades" :outcome="outcome" />
          </div>
        </section>

        <section v-if="market.info?.description" class="rounded-2xl border border-line bg-card p-5 lg:col-start-1">
          <h2 class="text-[15px] font-bold">Resolution rules</h2>
          <p class="mt-2 max-w-[70ch] text-muted">{{ market.info.description }}</p>
          <ImageCredit :market="market.market" class="mt-4 text-muted" />
        </section>
    </div>
  </template>
</template>
