# sylvanna

Frontend untuk [windrunner](https://github.com/Ayyasythz/windrunner), exchange prediction market biner. Vue 3, Vite, TypeScript, Tailwind.

## Menjalankan

Backend harus jalan dulu (lihat README windrunner). Lalu:

```sh
pnpm install
pnpm dev
```

Dev server meneruskan `/api` (REST dan WebSocket) ke backend, jadi tidak perlu CORS saat development.

| Variabel | Default | Arti |
|----------|---------|------|
| `WINDRUNNER_URL` | `http://127.0.0.1:8080` | Alamat backend untuk proxy dev server |
| `VITE_API_URL` | `/api` | Alamat API yang dipakai browser. Untuk deploy, isi URL backend penuh dan set `WINDRUNNER_CORS_ORIGINS` di backend |

Untuk mengisi backend lokal dengan tiga market contoh dan saldo 1.000 USDC per akun:

```sh
WINDRUNNER_ADMIN_KEY=rahasia ./scripts/seed.sh http://127.0.0.1:8080 1 2
```

Masuk di aplikasi memakai kunci API yang terdaftar di `WINDRUNNER_API_KEYS` backend.

## Struktur

| Path | Isi |
|------|-----|
| `src/lib/api.ts` | Tipe dan klien REST, pesan error |
| `src/lib/feed.ts` | Satu koneksi WebSocket yang menyambung ulang sendiri |
| `src/lib/units.ts` | Konversi integer API (basis poin, satuan mikro) ke tampilan |
| `src/composables` | Data market, akun, dan feed buku/trade |
| `src/views` | Halaman daftar market dan detail market |

## Perintah

```sh
pnpm build   # cek tipe (vue-tsc) lalu build produksi
```

## Atribusi

Gambar market di `public/markets/` adalah foto dummy dari Wikimedia Commons; pembuat dan lisensinya ada di `public/markets/CREDITS.md` dan juga ditampilkan di halaman market. Petanya ada di `src/lib/marketImages.ts` (berdasarkan ID market). Market tanpa gambar memakai ikon daun berwarna.


Grafik harga memakai [TradingView Lightweight Charts™](https://github.com/tradingview/lightweight-charts) (Apache-2.0), Copyright © 2025 TradingView, Inc. Logo TradingView di pojok grafik adalah tautan atribusi yang diwajibkan lisensinya, jadi jangan dimatikan tanpa menggantinya dengan tautan lain ke https://www.tradingview.com/.

## Lisensi

[MIT](LICENSE). Foto market dan Lightweight Charts memakai lisensinya masing-masing (lihat bagian Atribusi).
