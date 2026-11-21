import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { api } from '@/lib/api'
import { useSession } from '@/stores/session'

export function useAccount() {
  const { apiKey } = storeToRefs(useSession())
  const query = useQuery({
    queryKey: ['account', apiKey],
    queryFn: () => api.account(apiKey.value!),
    enabled: computed(() => apiKey.value !== null),
    refetchInterval: 15_000,
  })
  const account = computed(() => (apiKey.value ? query.data.value : undefined))
  return { account, apiKey }
}
