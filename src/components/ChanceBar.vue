<script setup lang="ts">
import { computed } from 'vue'

import { PRICE_SCALE } from '@/lib/units'

const props = defineProps<{ yes: number | null }>()

const width = computed(() => (props.yes === null ? '0%' : `${(props.yes / PRICE_SCALE) * 100}%`))
</script>

<template>
  <div class="h-1.5 overflow-hidden rounded-full" :class="yes === null ? 'bg-line' : 'bg-no/20'" aria-hidden="true">
    <div class="h-full rounded-full bg-yes transition-[width] duration-500 ease-out" :style="{ width }" />
  </div>
</template>
