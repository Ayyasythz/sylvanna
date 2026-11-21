import { ref } from 'vue'

import { type Book, type ExchangeEvent, type Trade, WS_URL } from './api'

export type BookMessage = Book & { channel: 'book' }
export type TradeMessage = { channel: 'trades'; market: number; seq: number; data: Trade }
export type UserMessage = { channel: 'user'; seq: number; data: ExchangeEvent }
type Message = BookMessage | TradeMessage | UserMessage
type Handler<M> = (message: M) => void

const USER = 'user'
const handlers = new Map<string, Set<Handler<never>>>()
const lastBook = new Map<string, BookMessage>()
let socket: WebSocket | null = null
let userKey: string | null = null

export const online = ref(false)

function send(payload: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
}

export function open() {
  if (socket) return
  const ws = new WebSocket(WS_URL)
  socket = ws
  ws.onopen = () => {
    online.value = true
    for (const key of handlers.keys()) {
      if (key === USER) continue
      const [channel, market] = key.split(':')
      send({ op: 'subscribe', channel, market: Number(market) })
    }
    if (userKey) send({ op: 'auth', key: userKey })
  }
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data) as { channel?: Message['channel']; market?: number }
    if (!message.channel) return
    const key = message.channel === 'user' ? USER : `${message.channel}:${message.market}`
    if (message.channel === 'book') {
      // The server may deliver an update produced before the snapshot it sent on subscribe.
      const previous = lastBook.get(key)
      const book = message as BookMessage
      if (previous && previous.seq > book.seq) return
      lastBook.set(key, book)
    }
    handlers.get(key)?.forEach((handler) => (handler as Handler<unknown>)(message))
  }
  ws.onclose = () => {
    online.value = false
    socket = null
    lastBook.clear()
    setTimeout(open, 1000)
  }
}

function add<M>(key: string, handler: Handler<M>): { first: boolean; remove: () => boolean } {
  let set = handlers.get(key)
  const first = !set
  if (!set) handlers.set(key, (set = new Set()))
  set.add(handler as Handler<never>)
  return {
    first,
    remove: () => {
      set.delete(handler as Handler<never>)
      if (set.size === 0) handlers.delete(key)
      return set.size === 0
    },
  }
}

function subscribe<M>(channel: 'book' | 'trades', market: number, handler: Handler<M>): () => void {
  const key = `${channel}:${market}`
  const { first, remove } = add(key, handler)
  open()
  if (first) send({ op: 'subscribe', channel, market })
  return () => {
    if (remove()) {
      lastBook.delete(key)
      send({ op: 'unsubscribe', channel, market })
    }
  }
}

export function onBook(market: number, handler: Handler<BookMessage>): () => void {
  const cached = lastBook.get(`book:${market}`)
  if (cached) handler(cached)
  return subscribe('book', market, handler)
}

export const onTrades = (market: number, handler: Handler<TradeMessage>) => subscribe('trades', market, handler)

export function onUser(handler: Handler<UserMessage>): () => void {
  const { remove } = add(USER, handler)
  return () => void remove()
}

export function setUserKey(key: string | null) {
  if (key === userKey) return
  const hadKey = userKey !== null
  userKey = key
  // The server has no way to drop an identity from a live connection.
  if (hadKey && socket) socket.close()
  else if (key) {
    open()
    send({ op: 'auth', key })
  }
}
