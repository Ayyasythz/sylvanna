import { useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { api, ApiError } from '@/lib/api'

const noRetryWhenDisabled = (count: number, error: Error) =>
  !(error instanceof ApiError && error.status === 503) && count < 2

/** Weekly volume and price change from hourly candles, plus a sparkline drawn from the latest trades. */
export function useMarketStats(market: MaybeRefOrGetter<number>) {
  const week = useQuery({
    queryKey: computed(() => ['candles', toValue(market), 'week']),
    queryFn: () => api.candles(toValue(market), '1h', 168),
    refetchInterval: 30_000,
    retry: noRetryWhenDisabled,
  })
  // Hourly candles are too coarse for a young market; individual trades give the line its shape.
  const recent = useQuery({
    queryKey: computed(() => ['trades', toValue(market), 'spark']),
    queryFn: () => api.trades(toValue(market), 40),
    refetchInterval: 30_000,
    retry: noRetryWhenDisabled,
  })

  return computed(() => {
    const candles = [...(week.data.value ?? [])].reverse()
    if (!candles.length) return null
    const trades = recent.data.value ?? []
    return {
      prices: trades.length > 1 ? trades.map((t) => t.yes_price).reverse() : null,
      volume: candles.reduce((sum, c) => sum + c.volume, 0),
      delta: candles.at(-1)!.close - candles[0]!.open,
    }
  })
}
