<script setup lang="ts">
import { computed } from 'vue'

import { marketImage } from '@/lib/marketImages'

const props = defineProps<{ market: number }>()
const image = computed(() => marketImage(props.market))
</script>

<template>
  <p v-if="image" class="text-[12px]">
    Photo:
    <a :href="image.credit.source" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:opacity-80">
      {{ image.credit.artist }}</a
    >,
    <a :href="image.credit.licenseUrl" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:opacity-80">
      {{ image.credit.license }}</a
    >, resized
  </p>
</template>
