<script setup lang="ts">
import { computed } from 'vue'

import ImageCredit from '@/components/ImageCredit.vue'
import SparkLine from '@/components/SparkLine.vue'
import { useMarketStats } from '@/composables/useMarketStats'
import { buyPrices, marketTitle, yesChance } from '@/composables/useMarkets'
import type { Market } from '@/lib/api'
import { marketImage } from '@/lib/marketImages'
import { cents, compact, date, PRICE_SCALE, split } from '@/lib/units'

const props = defineProps<{ market: Market }>()

const stats = useMarketStats(() => props.market.market)
const image = computed(() => marketImage(props.market.market))
const chance = computed(() => yesChance(props.market))
const odds = computed(() => (chance.value === null ? null : split(chance.value)))
const prices = computed(() => buyPrices(props.market))
const points = computed(() => (stats.value ? Math.round(stats.value.delta / 100) : 0))
const yesWidth = computed(() => `${((chance.value ?? PRICE_SCALE / 2) / PRICE_SCALE) * 100}%`)
const to = (outcome?: 'yes' | 'no') => ({
  name: 'market',
  params: { id: props.market.market },
  query: outcome ? { outcome } : {},
})
</script>

<template>
  <article class="relative isolate flex flex-col overflow-hidden rounded-3xl bg-ink p-6 text-white md:p-8">
    <template v-if="image">
      <img :src="image.src" alt="" class="absolute inset-0 -z-20 size-full object-cover" />
      <!-- Keeps white text readable over any photo. -->
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/92 to-ink/55" />
    </template>
    <svg v-else viewBox="0 0 32 32" class="absolute -top-12 -right-12 -z-10 size-72 text-white/[0.04]" aria-hidden="true">
      <path d="M9 23C9 12.5 13.5 6.5 26 6Z" class="fill-current" />
      <path d="M9 23C19.5 23 25.5 18.5 26 6Z" class="fill-current" />
    </svg>

    <div class="flex flex-wrap items-center gap-2 text-[13px] text-white/70">
      <span class="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-white">Most traded this week</span>
      <span v-if="market.info?.closes_at">Ends {{ date(market.info.closes_at) }}</span>
    </div>

    <h2 class="mt-4 max-w-[26ch] text-[26px] leading-tight font-bold tracking-tight md:text-[32px]">
      <RouterLink :to="to()" class="hover:underline hover:decoration-white/30 hover:underline-offset-4">
        {{ marketTitle(market) }}
      </RouterLink>
    </h2>
    <p v-if="market.info?.description" class="mt-3 max-w-[60ch] text-[14px] text-white/60">{{ market.info.description }}</p>

    <div class="mt-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        <div class="flex items-baseline gap-3">
          <span class="text-[60px] leading-none font-extrabold tracking-tight">{{ odds?.yes ?? '–' }}</span>
          <span class="text-[15px] font-semibold text-white/70">chance of Yes</span>
        </div>
        <div v-if="stats" class="mt-2 flex flex-wrap gap-x-4 text-[14px] text-white/70">
          <span v-if="points" :class="points > 0 ? 'text-[#5BD48F]' : 'text-[#FF8A8E]'">
            {{ points > 0 ? '▲' : '▼' }} {{ Math.abs(points) }} {{ Math.abs(points) === 1 ? 'pt' : 'pts' }} this week
          </span>
          <span>{{ compact(stats.volume) }} shares traded this week</span>
        </div>
      </div>
      <figure v-if="stats?.prices" class="w-full max-w-xs">
        <SparkLine class="h-16 w-full text-[#5BD48F]" :prices="stats.prices" />
        <figcaption class="mt-1 text-right text-[12px] text-white/50">Last {{ stats.prices.length }} trades</figcaption>
      </figure>
    </div>

    <div v-if="odds" class="mt-6">
      <div class="flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden="true">
        <div class="rounded-full bg-yes transition-[width] duration-500" :style="{ width: yesWidth }" />
        <div class="flex-1 rounded-full bg-no" />
      </div>
      <div class="mt-2 flex justify-between text-[13px] font-semibold">
        <span class="text-[#5BD48F]">Yes {{ odds.yes }}</span>
        <span class="text-[#FF8A8E]">No {{ odds.no }}</span>
      </div>
    </div>

    <div v-if="market.status === 'open'" class="mt-auto grid grid-cols-2 gap-2 pt-8 text-[15px] font-bold sm:max-w-md">
      <RouterLink :to="to('yes')" class="rounded-[12px] bg-yes-ink py-3 text-center hover:bg-yes-ink/85">
        Buy Yes {{ prices.yes === null ? '' : cents(prices.yes) }}
      </RouterLink>
      <RouterLink :to="to('no')" class="rounded-[12px] bg-no-ink py-3 text-center hover:bg-no-ink/85">
        Buy No {{ prices.no === null ? '' : cents(prices.no) }}
      </RouterLink>
    </div>
    <ImageCredit :market="market.market" class="mt-5 text-white/45" />
  </article>
</template>
