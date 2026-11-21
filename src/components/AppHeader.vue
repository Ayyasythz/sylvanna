<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppLogo from '@/components/AppLogo.vue'
import { useAccount } from '@/composables/useAccount'
import { describeError } from '@/lib/api'
import { online } from '@/lib/feed'
import { usdc } from '@/lib/units'
import { useSession } from '@/stores/session'

const session = useSession()
const { account } = useAccount()
const route = useRoute()
const router = useRouter()

const search = computed({
  get: () => (typeof route.query.q === 'string' ? route.query.q : ''),
  set: (q: string) => {
    const query = { ...(route.name === 'markets' ? route.query : {}), q: q || undefined }
    router.replace({ name: 'markets', query })
  },
})

const dialog = ref(false)
const key = ref('')
const error = ref('')
const busy = ref(false)
const input = ref<HTMLInputElement>()

async function openDialog() {
  dialog.value = true
  error.value = ''
  await nextTick()
  input.value?.focus()
}

async function signIn() {
  error.value = ''
  busy.value = true
  try {
    await session.signIn(key.value.trim())
    key.value = ''
    dialog.value = false
  } catch (e) {
    error.value = describeError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-line bg-card/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
      <RouterLink to="/" class="shrink-0" aria-label="Sylvanna home">
        <span class="hidden sm:block"><AppLogo /></span>
        <span class="sm:hidden"><AppLogo :wordmark="false" /></span>
      </RouterLink>

      <label class="relative mx-auto w-full max-w-md">
        <span class="sr-only">Search markets</span>
        <svg viewBox="0 0 20 20" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 fill-muted" aria-hidden="true">
          <path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64a.75.75 0 1 1-1.06 1.06l-3.64-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Search markets"
          class="w-full rounded-[10px] border border-line bg-page py-2 pr-3 pl-9 text-[14px] outline-none placeholder:text-muted focus:border-brand focus:bg-card"
        />
      </label>

      <div class="flex shrink-0 items-center gap-3">
        <span
          class="size-2 rounded-full"
          :class="online ? 'bg-yes' : 'bg-no'"
          :title="online ? 'Live prices connected' : 'Live prices disconnected'"
        />
        <template v-if="session.apiKey">
          <div v-if="account" class="hidden text-right leading-tight sm:block">
            <div class="text-[12px] text-muted">Balance</div>
            <div class="text-[15px] font-bold">{{ usdc(account.usdc.available) }}</div>
          </div>
          <button class="rounded-[10px] px-3 py-2 text-[14px] font-semibold text-muted hover:bg-page hover:text-ink" @click="session.signOut()">
            Sign out
          </button>
        </template>
        <button
          v-else
          class="rounded-[10px] bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:bg-brand/90"
          @click="openDialog"
        >
          Sign in
        </button>
      </div>
    </div>
  </header>

  <div
    v-if="dialog"
    class="fixed inset-0 z-20 grid place-items-center bg-ink/40 p-5"
    @click.self="dialog = false"
    @keydown.esc="dialog = false"
  >
    <form
      class="w-full max-w-sm rounded-2xl bg-card p-6 shadow-[0_20px_50px_-12px_rgb(18_26_44/0.35)]"
      aria-labelledby="signin-title"
      @submit.prevent="signIn"
    >
      <h2 id="signin-title" class="text-[20px] font-bold">Sign in to Sylvanna</h2>
      <p class="mt-1 text-[14px] text-muted">Paste your account's API key. It is stored in this browser only.</p>
      <label class="mt-5 block text-[14px] font-semibold" for="api-key">API key</label>
      <input
        id="api-key"
        ref="input"
        v-model="key"
        type="password"
        autocomplete="off"
        class="mt-1.5 w-full rounded-[10px] border border-line px-3 py-2.5 outline-none focus:border-brand"
      />
      <p v-if="error" class="mt-2 text-[14px] text-no-ink" role="alert">{{ error }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-[10px] px-4 py-2 text-[14px] font-semibold text-muted hover:text-ink" @click="dialog = false">
          Cancel
        </button>
        <button
          type="submit"
          :disabled="busy || !key.trim()"
          class="rounded-[10px] bg-brand px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-40"
        >
          {{ busy ? 'Checking…' : 'Sign in' }}
        </button>
      </div>
    </form>
  </div>
</template>
