<script setup lang="ts">
import { computed } from 'vue'

import ChanceBar from '@/components/ChanceBar.vue'
import MarketThumb from '@/components/MarketThumb.vue'
import SparkLine from '@/components/SparkLine.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useMarketStats } from '@/composables/useMarketStats'
import { buyPrices, marketTitle, yesChance } from '@/composables/useMarkets'
import type { Market } from '@/lib/api'
import { cents, compact, date, split } from '@/lib/units'

const props = defineProps<{ market: Market }>()

const stats = useMarketStats(() => props.market.market)
const chance = computed(() => yesChance(props.market))
const odds = computed(() => (chance.value === null ? null : split(chance.value)))
const prices = computed(() => buyPrices(props.market))
const rising = computed(() => (stats.value?.delta ?? 0) >= 0)
const to = (outcome?: 'yes' | 'no') => ({
  name: 'market',
  params: { id: props.market.market },
  query: outcome ? { outcome } : {},
})
</script>

<template>
  <article class="group relative flex flex-col rounded-2xl border border-line bg-card p-5 transition-colors hover:border-ink/25">
    <div class="flex items-start gap-3">
      <MarketThumb :market="market.market" class="size-12 rounded-[12px]" />
      <h3 class="line-clamp-3 flex-1 text-[16px] leading-snug font-semibold">
        <RouterLink :to="to()" class="after:absolute after:inset-0">{{ marketTitle(market) }}</RouterLink>
      </h3>
      <div v-if="odds" class="shrink-0 text-right">
        <div class="text-[22px] leading-none font-bold">{{ odds.yes }}</div>
        <div class="mt-1 text-[12px] text-muted">chance</div>
      </div>
    </div>

    <div class="mt-4 flex items-end gap-3">
      <ChanceBar class="flex-1" :yes="chance" />
      <SparkLine
        v-if="stats?.prices"
        class="h-7 w-20 shrink-0"
        :class="rising ? 'text-yes' : 'text-no'"
        :prices="stats.prices"
      />
    </div>
    <p v-if="!odds" class="mt-2 text-[13px] text-muted">No price yet. Place the first order.</p>

    <div v-if="market.status === 'open'" class="relative z-10 mt-4 grid grid-cols-2 gap-2 text-[14px] font-semibold">
      <RouterLink :to="to('yes')" class="rounded-[10px] bg-yes/10 py-2 text-center text-yes-ink hover:bg-yes-ink hover:text-white">
        Yes {{ prices.yes === null ? '' : cents(prices.yes) }}
      </RouterLink>
      <RouterLink :to="to('no')" class="rounded-[10px] bg-no/10 py-2 text-center text-no-ink hover:bg-no-ink hover:text-white">
        No {{ prices.no === null ? '' : cents(prices.no) }}
      </RouterLink>
    </div>

    <div class="mt-auto flex items-center justify-between gap-3 pt-4 text-[13px] text-muted">
      <StatusBadge :status="market.status" />
      <span v-if="stats?.volume">{{ compact(stats.volume) }} shares this week</span>
      <span v-else-if="market.info?.closes_at">Ends {{ date(market.info.closes_at) }}</span>
    </div>
  </article>
</template>
