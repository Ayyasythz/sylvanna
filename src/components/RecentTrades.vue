<script setup lang="ts">
import type { TradeTick } from '@/composables/useMarketFeed'
import type { Outcome } from '@/lib/api'
import { cents, clock, complement, outcomeName, shares } from '@/lib/units'

defineProps<{ trades: TradeTick[]; outcome: Outcome }>()

// A taker buying YES or selling NO lifts the YES price; the other two push it down.
const liftsYes = (trade: TradeTick) => (trade.side === 'buy') === (trade.outcome === 'yes')
</script>

<template>
  <div class="text-[14px]">
    <div class="grid grid-cols-4 px-2 pb-2 text-[12px] font-semibold text-muted">
      <span>Side</span>
      <span>Price</span>
      <span class="text-right">Shares</span>
      <span class="text-right">Time</span>
    </div>
    <p v-if="!trades.length" class="py-10 text-center text-muted">No trades yet. New trades show up here as they happen.</p>
    <div v-for="trade in trades" :key="trade.key" class="grid grid-cols-4 rounded-[6px] px-2 py-1.5 hover:bg-page">
      <span class="font-semibold" :class="liftsYes(trade) ? 'text-yes-ink' : 'text-no-ink'">
        {{ outcomeName(liftsYes(trade) ? 'yes' : 'no') }}
      </span>
      <span>{{ cents(outcome === 'yes' ? trade.yesPrice : complement(trade.yesPrice)) }}</span>
      <span class="text-right">{{ shares(trade.qty) }}</span>
      <span class="text-right text-muted">{{ clock(trade.ts) }}</span>
    </div>
  </div>
</template>
