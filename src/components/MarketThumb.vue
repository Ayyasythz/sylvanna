<script setup lang="ts">
import { computed } from 'vue'

import { marketImage } from '@/lib/marketImages'

const props = defineProps<{ market: number }>()

const image = computed(() => marketImage(props.market))
const TINTS = ['bg-brand', 'bg-yes-ink', 'bg-no-ink', 'bg-ink', 'bg-amber-600', 'bg-sky-700']
const tint = computed(() => TINTS[props.market % TINTS.length])
</script>

<template>
  <img v-if="image" :src="image.src" :alt="image.alt" loading="lazy" class="shrink-0 object-cover" />
  <span v-else class="grid shrink-0 place-items-center" :class="tint" aria-hidden="true">
    <svg viewBox="0 0 32 32" class="size-3/5">
      <path d="M9 23C9 12.5 13.5 6.5 26 6Z" class="fill-white" />
      <path d="M9 23C19.5 23 25.5 18.5 26 6Z" class="fill-white/55" />
    </svg>
  </span>
</template>
