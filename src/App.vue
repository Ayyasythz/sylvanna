<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { onScopeDispose } from 'vue'

import AppHeader from '@/components/AppHeader.vue'
import { onUser, open } from '@/lib/feed'

open()

const queryClient = useQueryClient()
const stop = onUser(() => {
  queryClient.invalidateQueries({ queryKey: ['account'] })
  queryClient.invalidateQueries({ queryKey: ['markets'] })
})
onScopeDispose(stop)
</script>

<template>
  <AppHeader />
  <main class="mx-auto max-w-6xl px-5 pt-8 pb-20">
    <RouterView />
  </main>
</template>
