<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'

import MarketThumb from '@/components/MarketThumb.vue'
import { marketTitle } from '@/composables/useMarkets'
import { api, type Market, type Outcome, type Side } from '@/lib/api'
import { onTrades } from '@/lib/feed'
import { ago, cents, complement, outcomeName, shares } from '@/lib/units'

const props = defineProps<{ markets: Market[] }>()

interface Item {
  key: string
  market: number
  ts: number
  yesPrice: number
  qty: number
  side: Side
  outcome: Outcome
}

const LIMIT = 6
const items = ref<Item[]>([])
const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 15_000)
const stops = new Map<number, () => void>()

const titles = computed(() => new Map(props.markets.map((m) => [m.market, marketTitle(m)])))

function add(list: Item[]) {
  const seen = new Set(items.value.map((i) => i.key))
  items.value = [...items.value, ...list.filter((i) => !seen.has(i.key))].sort((a, b) => b.ts - a.ts).slice(0, LIMIT)
}

watch(
  () => props.markets.map((m) => m.market),
  (ids) => {
    for (const id of ids) {
      if (stops.has(id)) continue
      let index = 0
      stops.set(
        id,
        onTrades(id, ({ seq, data }) => {
          add([
            {
              key: `${id}:${seq}:live:${index++}`,
              market: id,
              ts: Date.now(),
              yesPrice: data.yes_price,
              qty: data.qty,
              side: data.taker.side,
              outcome: data.taker.outcome,
            },
          ])
        }),
      )
      api
        .trades(id, LIMIT)
        .then((rows) =>
          add(
            rows.map((row) => ({
              key: `${id}:${row.id}`,
              market: id,
              ts: row.ts,
              yesPrice: row.yes_price,
              qty: row.qty,
              side: row.taker_side,
              outcome: row.taker_outcome,
            })),
          ),
        )
        .catch(() => {})
    }
  },
  { immediate: true },
)

onScopeDispose(() => {
  clearInterval(timer)
  stops.forEach((stop) => stop())
})
</script>

<template>
  <section class="flex flex-col rounded-3xl border border-line bg-card p-5">
    <div class="flex items-center justify-between">
      <h2 class="text-[16px] font-bold">Recent activity</h2>
      <span class="flex items-center gap-1.5 text-[12px] font-semibold text-yes-ink">
        <span class="relative flex size-2">
          <span class="absolute inline-flex size-full animate-ping rounded-full bg-yes opacity-60 motion-reduce:hidden" />
          <span class="relative inline-flex size-2 rounded-full bg-yes" />
        </span>
        Live
      </span>
    </div>

    <p v-if="!items.length" class="my-auto py-8 text-center text-[14px] text-muted">Trades will appear here as they happen.</p>
    <ul v-else class="mt-3 divide-y divide-line">
      <li v-for="item in items" :key="item.key" class="py-2.5">
        <RouterLink :to="{ name: 'market', params: { id: item.market } }" class="group flex items-center gap-3">
          <MarketThumb :market="item.market" class="size-9 rounded-[9px]" />
          <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3 text-[14px]">
            <span class="flex flex-wrap gap-x-1.5">
              <span class="font-semibold" :class="item.outcome === 'yes' ? 'text-yes-ink' : 'text-no-ink'">
                {{ item.side === 'buy' ? 'Bought' : 'Sold' }} {{ outcomeName(item.outcome) }}
              </span>
              <span class="text-muted">
                {{ shares(item.qty) }} at {{ cents(item.outcome === 'yes' ? item.yesPrice : complement(item.yesPrice)) }}
              </span>
            </span>
            <span class="shrink-0 text-[12px] text-muted">{{ ago(item.ts, now) }}</span>
          </div>
          <div class="mt-0.5 truncate text-[13px] text-muted group-hover:text-ink">{{ titles.get(item.market) }}</div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
