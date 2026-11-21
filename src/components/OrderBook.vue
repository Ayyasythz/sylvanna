<script setup lang="ts">
import { computed } from 'vue'

import type { Book, Level, Outcome } from '@/lib/api'
import { cents, complement, shares, usdc, notional } from '@/lib/units'

const props = defineProps<{ book: Book | null; outcome: Outcome }>()
const emit = defineEmits<{ pick: [price: number] }>()

const DEPTH = 6

// The server keeps one book in YES prices. A NO bid is a YES ask at the complementary price, and vice versa.
const sides = computed(() => {
  const book = props.book
  if (!book) return { asks: [] as Level[], bids: [] as Level[] }
  if (props.outcome === 'yes') return { asks: book.asks, bids: book.bids }
  const flip = (levels: Level[]): Level[] => levels.map(([price, qty]) => [complement(price), qty])
  return { asks: flip(book.bids), bids: flip(book.asks) }
})

const rows = computed(() => {
  const asks = sides.value.asks.slice(0, DEPTH)
  const bids = sides.value.bids.slice(0, DEPTH)
  const largest = Math.max(1, ...asks.map(([, q]) => q), ...bids.map(([, q]) => q))
  const withBar = ([price, qty]: Level) => ({
    price,
    qty,
    total: notional(price, qty),
    width: `${(qty / largest) * 100}%`,
  })
  return { asks: asks.map(withBar).reverse(), bids: bids.map(withBar) }
})

const spread = computed(() => {
  const ask = sides.value.asks[0]?.[0]
  const bid = sides.value.bids[0]?.[0]
  return ask === undefined || bid === undefined ? null : ask - bid
})
</script>

<template>
  <div class="text-[14px]">
    <div class="grid grid-cols-3 px-2 pb-2 text-[12px] font-semibold text-muted">
      <span>Price</span>
      <span class="text-right">Shares</span>
      <span class="text-right">Total</span>
    </div>

    <p v-if="!book" class="py-10 text-center text-muted">Loading order book…</p>
    <template v-else>
      <p v-if="!rows.asks.length" class="px-2 py-2 text-[13px] text-muted">No sellers yet.</p>
      <button
        v-for="row in rows.asks"
        :key="`a${row.price}`"
        class="relative grid w-full grid-cols-3 rounded-[6px] px-2 py-1.5 text-left hover:bg-page"
        :title="`Use ${cents(row.price)}`"
        @click="emit('pick', row.price)"
      >
        <span class="absolute inset-y-0.5 right-0 rounded-[4px] bg-no/10" :style="{ width: row.width }" />
        <span class="relative font-semibold text-no-ink">{{ cents(row.price) }}</span>
        <span class="relative text-right">{{ shares(row.qty) }}</span>
        <span class="relative text-right text-muted">{{ usdc(row.total) }}</span>
      </button>

      <div class="my-1.5 flex items-center justify-between rounded-[6px] bg-page px-2 py-1.5 text-[12px] text-muted">
        <span>Spread</span>
        <span class="font-semibold text-ink">{{ spread === null ? '–' : cents(spread) }}</span>
      </div>

      <button
        v-for="row in rows.bids"
        :key="`b${row.price}`"
        class="relative grid w-full grid-cols-3 rounded-[6px] px-2 py-1.5 text-left hover:bg-page"
        :title="`Use ${cents(row.price)}`"
        @click="emit('pick', row.price)"
      >
        <span class="absolute inset-y-0.5 right-0 rounded-[4px] bg-yes/10" :style="{ width: row.width }" />
        <span class="relative font-semibold text-yes-ink">{{ cents(row.price) }}</span>
        <span class="relative text-right">{{ shares(row.qty) }}</span>
        <span class="relative text-right text-muted">{{ usdc(row.total) }}</span>
      </button>
      <p v-if="!rows.bids.length" class="px-2 py-2 text-[13px] text-muted">No buyers yet.</p>
    </template>
  </div>
</template>
