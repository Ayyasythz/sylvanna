# sylvanna

Frontend for [windrunner](https://github.com/Ayyasythz/windrunner), a binary prediction market exchange. Vue 3, Vite, TypeScript, Tailwind.

## Running

Start the backend first (see the windrunner README), then:

```sh
pnpm install
pnpm dev
```

The dev server proxies `/api` (REST and WebSocket) to the backend, so CORS isn't needed during development.

| Variable | Default | Meaning |
|----------|---------|---------|
| `WINDRUNNER_URL` | `http://127.0.0.1:8080` | Backend address for the dev server proxy |
| `VITE_API_URL` | `/api` | API address the browser uses. For a deployment, set the full backend URL and set `WINDRUNNER_CORS_ORIGINS` on the backend |

To fill a local backend with six sample markets and 1,000 USDC per account:

```sh
WINDRUNNER_ADMIN_KEY=secret ./scripts/seed.sh http://127.0.0.1:8080 1 2
```

Sign in to the app with an API key listed in the backend's `WINDRUNNER_API_KEYS`.

## Layout

| Path | Contents |
|------|----------|
| `src/lib/api.ts` | REST types and client, error messages |
| `src/lib/feed.ts` | A single WebSocket connection that reconnects on its own |
| `src/lib/units.ts` | Converts the API's integers (basis points, micro units) for display |
| `src/lib/marketImages.ts` | Placeholder image for each market ID |
| `src/composables` | Market, account, stats and order book/trade feed data |
| `src/components` | Market cards, featured market, live activity, chart, order book, order ticket |
| `src/views` | Market list and market detail pages |

## Commands

```sh
pnpm build   # type-check (vue-tsc), then a production build
```

## Attribution

The market images in `public/markets/` are placeholder photos from Wikimedia Commons. Their authors and licences are listed in `public/markets/CREDITS.md` and shown on each market's page. `src/lib/marketImages.ts` maps them to market IDs; markets without an image get a coloured leaf icon.

The price chart uses [TradingView Lightweight Charts™](https://github.com/tradingview/lightweight-charts) (Apache-2.0), Copyright © 2025 TradingView, Inc. The TradingView logo in the chart corner is the attribution link its licence requires, so don't turn it off without adding another link to https://www.tradingview.com/.

## License

[MIT](LICENSE). The market photos and Lightweight Charts keep their own licences (see Attribution).
