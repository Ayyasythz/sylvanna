import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { api } from '@/lib/api'
import { setUserKey } from '@/lib/feed'

const STORAGE_KEY = 'sylvanna.apiKey'

export const useSession = defineStore('session', () => {
  const apiKey = ref<string | null>(localStorage.getItem(STORAGE_KEY))

  watch(
    apiKey,
    (key) => {
      if (key) localStorage.setItem(STORAGE_KEY, key)
      else localStorage.removeItem(STORAGE_KEY)
      setUserKey(key)
    },
    { immediate: true },
  )

  /** Throws ApiError when the server does not know the key. */
  async function signIn(key: string) {
    await api.account(key)
    apiKey.value = key
  }

  function signOut() {
    apiKey.value = null
  }

  return { apiKey, signIn, signOut }
})
