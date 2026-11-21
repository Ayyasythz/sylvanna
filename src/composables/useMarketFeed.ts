import { onScopeDispose, type Ref, ref, watch } from 'vue'

import { api, type Book, type Outcome, type Side } from '@/lib/api'
import { onBook, onTrades } from '@/lib/feed'

export interface TradeTick {
  key: string
  ts: number
  yesPrice: number
  qty: number
  side: Side
  outcome: Outcome
}

const MAX_TRADES = 40

export function useMarketFeed(market: Ref<number>) {
  const book = ref<Book | null>(null)
  const trades = ref<TradeTick[]>([])
  let stop: (() => void) | undefined

  watch(
    market,
    (id) => {
      stop?.()
      book.value = null
      trades.value = []
      let live = true

      // History is optional on the server; without it the list starts empty and fills from the stream.
      api
        .trades(id, MAX_TRADES)
        .then((rows) => {
          if (!live) return
          const seen = new Set(trades.value.map((t) => t.key))
          const older = rows
            .map((row) => ({
              key: `${row.seq}:${row.id % 2 ** 20}`,
              ts: row.ts,
              yesPrice: row.yes_price,
              qty: row.qty,
              side: row.taker_side,
              outcome: row.taker_outcome,
            }))
            .filter((t) => !seen.has(t.key))
          trades.value = [...trades.value, ...older].slice(0, MAX_TRADES)
        })
        .catch(() => {})

      const counters = new Map<number, number>()
      const stopBook = onBook(id, (message) => {
        book.value = message
      })
      const stopTrades = onTrades(id, ({ seq, data }) => {
        const index = counters.get(seq) ?? 0
        counters.set(seq, index + 1)
        const tick: TradeTick = {
          key: `${seq}:live:${index}`,
          ts: Date.now(),
          yesPrice: data.yes_price,
          qty: data.qty,
          side: data.taker.side,
          outcome: data.taker.outcome,
        }
        trades.value = [tick, ...trades.value].slice(0, MAX_TRADES)
      })
      stop = () => {
        live = false
        stopBook()
        stopTrades()
      }
    },
    { immediate: true },
  )
  onScopeDispose(() => stop?.())

  return { book, trades }
}
