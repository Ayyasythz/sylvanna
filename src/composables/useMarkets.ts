import { useQuery } from '@tanstack/vue-query'

import { api, type Market } from '@/lib/api'
import { complement } from '@/lib/units'

export function useMarkets() {
  return useQuery({ queryKey: ['markets'], queryFn: api.markets, refetchInterval: 5_000 })
}

export const marketTitle = (market: Market) => market.info?.title ?? `Market #${market.market}`

/** Implied YES probability in basis points, or null while the book is empty. */
export function yesChance(market: Pick<Market, 'status' | 'best_bid' | 'best_ask'>): number | null {
  if (typeof market.status === 'object') return market.status.resolved.winner === 'yes' ? 10_000 : 0
  const { best_bid: bid, best_ask: ask } = market
  if (bid !== null && ask !== null) return Math.round((bid + ask) / 2)
  return bid ?? ask
}

/** What it costs right now to buy one share of each outcome. */
export function buyPrices(market: Pick<Market, 'best_bid' | 'best_ask'>) {
  return {
    yes: market.best_ask,
    no: market.best_bid === null ? null : complement(market.best_bid),
  }
}
