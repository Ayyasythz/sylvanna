<script setup lang="ts">
import { computed } from 'vue'

import type { MarketStatus } from '@/lib/api'

const props = defineProps<{ status: MarketStatus }>()

const view = computed(() => {
  const status = props.status
  if (typeof status === 'object') {
    return status.resolved.winner === 'yes'
      ? { label: 'Resolved: Yes', tone: 'bg-yes/10 text-yes-ink', dot: 'bg-yes' }
      : { label: 'Resolved: No', tone: 'bg-no/10 text-no-ink', dot: 'bg-no' }
  }
  if (status === 'open') return { label: 'Live', tone: 'bg-brand/8 text-brand', dot: 'bg-brand' }
  if (status === 'paused') return { label: 'Paused', tone: 'bg-amber-500/12 text-amber-800', dot: 'bg-amber-500' }
  return { label: 'Closed', tone: 'bg-ink/6 text-muted', dot: 'bg-muted' }
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" :class="view.tone">
    <span class="size-1.5 rounded-full" :class="view.dot" />
    {{ view.label }}
  </span>
</template>
