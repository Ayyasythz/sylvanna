export const PRICE_SCALE = 10_000
export const UNIT = 1_000_000

const number = (value: number, digits: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })

export const cents = (bps: number) => `${number(bps / 100, 2)}¢`

export const percent = (bps: number) => `${number(bps / 100, 0)}%`

export const shares = (micro: number) => number(micro / UNIT, 2)

export const usdc = (micro: number) =>
  `$${(micro / UNIT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Whole-percent YES/NO split that always adds up to 100. */
export function split(bps: number) {
  const yes = Math.round(bps / 100)
  return { yes: `${yes}%`, no: `${100 - yes}%` }
}

export const complement = (bps: number) => PRICE_SCALE - bps

export const notional = (bps: number, qty: number) => Math.floor((qty * bps) / PRICE_SCALE)

/** Rounds user input down to the market's lot; null when it is not a positive amount. */
export function toQty(input: number, lot: number): number | null {
  if (!Number.isFinite(input) || input <= 0) return null
  const qty = Math.floor(Math.round(input * UNIT) / lot) * lot
  return qty > 0 ? qty : null
}

/** Price typed in cents, snapped to the market's tick; null when out of range. */
export function toPrice(inputCents: number, tick: number): number | null {
  if (!Number.isFinite(inputCents)) return null
  const bps = Math.round((inputCents * 100) / tick) * tick
  return bps >= tick && bps <= PRICE_SCALE - tick ? bps : null
}

export const outcomeName = (outcome: 'yes' | 'no') => (outcome === 'yes' ? 'Yes' : 'No')

export const date = (ms: number) => new Date(ms).toLocaleDateString('en-US', { dateStyle: 'medium' })

export const dateTime = (ms: number) =>
  new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB')

export function ago(ms: number, now: number) {
  const seconds = Math.max(0, Math.round((now - ms) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date(ms)
}

export const compact = (micro: number) =>
  (micro / UNIT).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
