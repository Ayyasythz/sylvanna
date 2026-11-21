<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'

import { useAccount } from '@/composables/useAccount'
import { api, describeError, type OpenOrder, type Outcome } from '@/lib/api'
import { cents, outcomeName, shares } from '@/lib/units'

const props = defineProps<{ market: number }>()

const { account, apiKey } = useAccount()
const queryClient = useQueryClient()
const cancelling = ref<number | null>(null)
const error = ref('')

const orders = computed(() => account.value?.open_orders.filter((o) => o.market === props.market) ?? [])
const positions = computed(
  () => account.value?.positions.filter((p) => p.market === props.market && p.available + p.reserved > 0) ?? [],
)
const tone = (outcome: Outcome) => (outcome === 'yes' ? 'bg-yes/10 text-yes-ink' : 'bg-no/10 text-no-ink')

async function cancel(order: OpenOrder) {
  if (!apiKey.value) return
  cancelling.value = order.order_id
  error.value = ''
  try {
    await api.cancelOrder(apiKey.value, order.market, order.order_id)
  } catch (e) {
    error.value = describeError(e)
  } finally {
    cancelling.value = null
    queryClient.invalidateQueries({ queryKey: ['account'] })
  }
}
</script>

<template>
  <section v-if="account" class="rounded-2xl border border-line bg-card p-5 text-[14px]">
    <h2 class="text-[15px] font-bold">Your position</h2>
    <p v-if="!positions.length" class="mt-2 text-muted">You don't hold shares in this market yet.</p>
    <div v-for="position in positions" :key="position.outcome" class="mt-3 flex items-center justify-between gap-3">
      <span class="rounded-[6px] px-2 py-0.5 text-[13px] font-semibold" :class="tone(position.outcome)">
        {{ outcomeName(position.outcome) }}
      </span>
      <span class="text-right">
        <span class="font-semibold">{{ shares(position.available + position.reserved) }} shares</span>
        <span v-if="position.reserved" class="block text-[12px] text-muted">{{ shares(position.reserved) }} listed for sale</span>
      </span>
    </div>

    <h2 class="mt-6 text-[15px] font-bold">Open orders</h2>
    <p v-if="!orders.length" class="mt-2 text-muted">No open orders.</p>
    <div v-for="order in orders" :key="order.order_id" class="mt-3 flex items-center justify-between gap-3">
      <span class="flex items-center gap-2">
        <span class="rounded-[6px] px-2 py-0.5 text-[13px] font-semibold" :class="tone(order.outcome)">
          {{ order.side === 'buy' ? 'Buy' : 'Sell' }} {{ outcomeName(order.outcome) }}
        </span>
        <span class="text-muted">{{ shares(order.remaining) }} at {{ cents(order.price) }}</span>
      </span>
      <button
        class="shrink-0 rounded-[8px] px-2.5 py-1 text-[13px] font-semibold text-muted ring-1 ring-line hover:bg-page hover:text-ink disabled:opacity-40"
        :disabled="cancelling === order.order_id"
        @click="cancel(order)"
      >
        {{ cancelling === order.order_id ? 'Cancelling…' : 'Cancel' }}
      </button>
    </div>
    <p v-if="error" class="mt-3 text-no-ink" role="alert">{{ error }}</p>
  </section>
</template>
