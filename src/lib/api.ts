export type Outcome = 'yes' | 'no'
export type Side = 'buy' | 'sell'
export type TimeInForce = 'gtc' | 'fok' | 'fak' | { gtd: { expires_at: number } }
export type MarketStatus = 'open' | 'paused' | 'closed' | { resolved: { winner: Outcome } }
export type SettlementKind = 'transfer_yes' | 'transfer_no' | 'mint' | 'merge'

export interface MarketInfo {
  title: string
  description: string
  closes_at: number | null
}

export interface Market {
  market: number
  status: MarketStatus
  info: MarketInfo | null
  tick: number
  lot: number
  best_bid: number | null
  best_ask: number | null
}

export type Level = [price: number, qty: number]

export interface Book {
  market: number
  seq: number
  bids: Level[]
  asks: Level[]
}

export interface Fill {
  order_id: number
  account: number
  side: Side
  outcome: Outcome
  remaining: number
}

export interface Trade {
  market: number
  yes_price: number
  qty: number
  kind: SettlementKind
  maker: Fill
  taker: Fill
}

export type ExchangeEvent =
  | { accepted: { order_id: number } }
  | { rejected: { order_id: number; reason: string } }
  | { trade: Trade }
  | { rested: { order_id: number; remaining: number } }
  | { cancelled: { market: number; order_id: number; account: number; remaining: number; reason: string } }
  | { cancel_rejected: { order_id: number; reason: string } }

export interface Balance {
  available: number
  reserved: number
}

export interface Position extends Balance {
  market: number
  outcome: Outcome
}

export interface OpenOrder {
  order_id: number
  market: number
  side: Side
  outcome: Outcome
  price: number
  remaining: number
}

export interface Account {
  account: number
  usdc: Balance
  positions: Position[]
  open_orders: OpenOrder[]
}

export interface TradeRow {
  id: number
  seq: number
  ts: number
  market: number
  yes_price: number
  qty: number
  kind: SettlementKind
  taker_side: Side
  taker_outcome: Outcome
}

export interface Candle {
  start: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  trades: number
}

export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface NewOrder {
  market: number
  side: Side
  outcome: Outcome
  price: number
  qty: number
  tif?: TimeInForce
  post_only?: boolean
}

export interface OrderResult {
  order_id: number
  seq: number
  events: ExchangeEvent[]
}

const BASE: string = import.meta.env.VITE_API_URL ?? '/api'

export const WS_URL = /^https?:/.test(BASE)
  ? `${BASE.replace(/^http/, 'ws')}/ws`
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${BASE}/ws`

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

async function request<T>(method: string, path: string, options: { key?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.key) headers.authorization = `Bearer ${options.key}`
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  let response: Response
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, payload?.error ?? `http_${response.status}`)
  return payload as T
}

export const api = {
  markets: () => request<{ markets: Market[] }>('GET', '/markets').then((r) => r.markets),
  trades: (market: number, limit = 30) =>
    request<{ trades: TradeRow[] }>('GET', `/markets/${market}/trades?limit=${limit}`).then((r) => r.trades),
  candles: (market: number, interval: CandleInterval, limit: number) =>
    request<{ candles: Candle[] }>('GET', `/markets/${market}/candles?interval=${interval}&limit=${limit}`).then(
      (r) => r.candles,
    ),
  account: (key: string) => request<Account>('GET', '/account', { key }),
  placeOrder: (key: string, order: NewOrder) => request<OrderResult>('POST', '/orders', { key, body: order }),
  cancelOrder: (key: string, market: number, orderId: number) =>
    request<{ seq: number; events: ExchangeEvent[] }>('DELETE', `/markets/${market}/orders/${orderId}`, { key }),
}

const MESSAGES: Record<string, string> = {
  network: "Can't reach the server. Check your connection and try again.",
  unauthorized: 'That API key is not recognized.',
  insufficient_funds: "You don't have enough USDC for this order.",
  insufficient_shares: "You don't have enough shares to sell.",
  invalid_price: "Price must be between 1¢ and 99¢ and match the market's tick.",
  invalid_qty: "Amount doesn't match the market's minimum share size.",
  market_not_open: 'This market is not taking orders right now.',
  fok_not_fillable: "This order can't be filled in full right now.",
  post_only_would_cross: 'A post-only order would trade immediately at this price.',
  unknown_market: 'Market not found.',
  unknown_order: 'That order is no longer on the book.',
  not_owner: "That order doesn't belong to your account.",
  busy: 'The exchange is busy. Try again in a moment.',
  unavailable: 'The exchange is unavailable right now.',
  history_disabled: 'Trade history is turned off on this server.',
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? `Request failed (${error.code}).`
  return 'Something went wrong. Try again.'
}
