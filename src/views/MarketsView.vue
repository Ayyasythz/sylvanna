<script setup lang="ts">
import { useQueries } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FeaturedMarket from '@/components/FeaturedMarket.vue'
import LiveActivity from '@/components/LiveActivity.vue'
import MarketCard from '@/components/MarketCard.vue'
import { marketTitle, useMarkets } from '@/composables/useMarkets'
import { api, ApiError, describeError, type Market } from '@/lib/api'

type Filter = 'all' | 'open' | 'done'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Live' },
  { value: 'done', label: 'Resolved' },
]

const route = useRoute()
const router = useRouter()
const { data: markets, error, isPending } = useMarkets()

// Same query keys as each card's sparkline, so this costs no extra requests.
const weekly = useQueries({
  queries: computed(() =>
    (markets.value ?? []).map((m) => ({
      queryKey: ['candles', m.market, 'week'],
      queryFn: () => api.candles(m.market, '1h', 168),
      retry: (count: number, e: Error) => !(e instanceof ApiError && e.status === 503) && count < 2,
    })),
  ),
})

const featured = computed(() => {
  const list = markets.value ?? []
  let best: Market | undefined
  let bestVolume = 0
  list.forEach((market, i) => {
    if (market.status !== 'open') return
    const volume = (weekly.value[i]?.data ?? []).reduce((sum, c) => sum + c.volume, 0)
    if (volume > bestVolume) {
      best = market
      bestVolume = volume
    }
  })
  return best
})

const filter = computed<Filter>(() => {
  const value = route.query.status
  return value === 'open' || value === 'done' ? value : 'all'
})
const search = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim().toLowerCase() : ''))

const matches = (market: Market) => {
  const running = market.status === 'open' || market.status === 'paused'
  if (filter.value === 'open' && !running) return false
  if (filter.value === 'done' && running) return false
  if (!search.value) return true
  const text = `${marketTitle(market)} ${market.info?.description ?? ''}`.toLowerCase()
  return text.includes(search.value)
}
const shown = computed(() => (markets.value ?? []).filter(matches))
const browsing = computed(() => !search.value && filter.value === 'all')

function setFilter(value: Filter) {
  router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } })
}
</script>

<template>
  <p v-if="isPending" class="mt-10 text-muted">Loading markets…</p>
  <p v-else-if="error && !markets" class="mt-10 text-no-ink" role="alert">{{ describeError(error) }}</p>

  <template v-else>
    <div v-if="browsing && markets?.length" class="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <FeaturedMarket v-if="featured" :market="featured" />
      <section v-else class="flex flex-col justify-center rounded-3xl bg-ink p-8 text-white">
        <h1 class="max-w-[22ch] text-[30px] leading-tight font-bold tracking-tight">Trade on what happens next.</h1>
        <p class="mt-3 max-w-[48ch] text-white/70">
          Every share pays $1 if it's right. Its price is the crowd's estimate of the chance it happens.
        </p>
      </section>
      <LiveActivity :markets="markets" />
    </div>

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-[24px] leading-tight font-bold tracking-tight">{{ search ? 'Search results' : 'Markets' }}</h1>
        <p class="mt-1 text-[14px] text-muted">Prices are chances. A share that turns out right pays $1.</p>
      </div>
      <div class="flex gap-1 rounded-[12px] bg-card p-1 ring-1 ring-line" role="group" aria-label="Filter markets">
        <button
          v-for="option in FILTERS"
          :key="option.value"
          class="rounded-[9px] px-3 py-1.5 text-[14px] font-semibold"
          :class="filter === option.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'"
          :aria-pressed="filter === option.value"
          @click="setFilter(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="!shown.length" class="mt-6 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p class="font-semibold">{{ search ? `No markets match “${search}”.` : 'No markets here yet.' }}</p>
      <button
        v-if="search || filter !== 'all'"
        class="mt-3 text-[14px] font-semibold text-brand hover:underline"
        @click="router.replace({ query: {} })"
      >
        Show all markets
      </button>
    </div>
    <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MarketCard v-for="market in shown" :key="market.market" :market="market" />
    </div>
  </template>
</template>
