<script setup lang="ts">
withDefaults(defineProps<{ wordmark?: boolean }>(), { wordmark: true })
</script>

<!-- A leaf for the name (sylvan), split along its midrib into the two outcomes. -->
<template>
  <span class="inline-flex items-center gap-2.5">
    <svg viewBox="0 0 32 32" class="size-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" class="fill-brand" />
      <path d="M9 23C9 12.5 13.5 6.5 26 6Z" class="fill-white" />
      <path d="M9 23C19.5 23 25.5 18.5 26 6Z" class="fill-white/55" />
      <path d="M9 23L5.5 26.5" class="stroke-white" stroke-width="2" stroke-linecap="round" />
    </svg>
    <span v-if="wordmark" class="text-[19px] font-extrabold tracking-[-0.03em]">sylvanna</span>
  </span>
</template>
