<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ prices: number[] }>()

const W = 100
const H = 32

const path = computed(() => {
  const prices = props.prices.length === 1 ? [props.prices[0]!, props.prices[0]!] : props.prices
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  // Keep a minimum vertical range so a flat market reads as flat rather than as noise.
  const pad = Math.max(0, 500 - (high - low)) / 2
  const min = low - pad
  const span = high + pad - min || 1
  const step = W / (prices.length - 1)
  return prices.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(2)},${(H - ((p - min) / span) * H).toFixed(2)}`).join('')
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="overflow-visible" aria-hidden="true">
    <path :d="`${path}L${W},${H}L0,${H}Z`" class="fill-current opacity-10" />
    <path :d="path" class="fill-none stroke-current" stroke-width="1.75" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
  </svg>
</template>
