# POS Cuci Steam Motor & Mobil

Sistem **Point of Sale** untuk outlet cuci steam (motor & mobil). Repo ini berisi **backend API saja** — tidak ada antarmuka web Next.js. Satu-satunya klien adalah aplikasi Expo/React Native di [`mobile/`](./mobile/), yang memanggil backend ini lewat `EXPO_PUBLIC_API_BASE_URL`.

| | |
|---|---|
| **Produk** | Backend API sistem Point of Sale untuk outlet cuci steam (motor & mobil) |
| **Status** | Backend stabil; klien Expo aktif dikembangkan |
| **Tanggal mulai** | 20 Oktober 2026 |
| **Dokumen spesifikasi** | [`prd.md`](./prd.md) — lihat catatan implementasi terkini di bagian atas |
| **Terakhir diperbarui** | 27 November 2026 |

---

## Arsitektur

| Komponen | Lokasi | Catatan |
|---|---|---|
| **Backend API** | `src/app/api/**` | Next.js 16 Route Handlers; Better Auth; Drizzle + Supabase/PostgreSQL |
| **Klien** | [`mobile/`](./mobile/) | Expo SDK ~58 + React Navigation v7; empat tab: **Kasir, Antrean, Laporan, Pengaturan** |
| **CORS** | [`src/proxy.ts`](./src/proxy.ts) | Proxy Next.js 16: origin dev lokal dan origin dari `WEB_ORIGIN` / `BETTER_AUTH_URL` |

Tidak ada halaman atau komponen UI web di repo ini. `npm run dev` hanya menyalakan server API; root `/` mengembalikan JSON status (`{ name, status, description, health }`) dan health check tersedia di `GET /api/health`.

## Tim & Peran

| Kontributor | Peran | Fokus utama |
|---|---|---|
| `irgifebry` | **Frontend** | Klien Expo/React Native di [`mobile/`](./mobile/) — Kasir, Antrean, Laporan, Pengaturan, navigasi, tema, dan pengalaman pengguna |
| `muhamadnajwan23` | Backend | API Route Handlers, service layer, dan skema database |
| `Dimas` | Kontributor | Perubahan awal (arsip commit) |

Ringkasan endpoint (kontrak lengkap di [`docs/backend/README.md`](./docs/backend/README.md)):

| Kelompok | Endpoint |
|---|---|
| Auth & health | `/api/auth/[...all]`, `/api/health` |
| Master data | `/api/packages`, `/api/addons`, `/api/outlets`, `/api/banks`, `/api/settings` |
| Transaksi & antrean | `/api/orders`, `/api/board`, `/api/receipts/:token` |
| Kas & laporan | `/api/cash-shifts`, `/api/dashboard/today`, `/api/reports/*`, `/api/reports/export.csv`, `/api/reports/export.xlsx` |
| Pengguna & audit | `/api/users`, `/api/audit-logs` |
| Offline | `/api/sync/bootstrap`, `/api/sync/batch` |

Semua data diakses lewat Route Handler; browser/klien tidak pernah bicara langsung ke Supabase.

---

## Aturan Bisnis Inti

| Area | Aturan |
|---|---|
| Nomor antrean | Per tipe kendaraan: `M-001` (Motor) / `C-001` (Mobil), reset harian |
| Nomor invoice | `S-YYYYMMDD-NNN`, unik per outlet per tanggal |
| Urutan status | `MENUNGGU` → `PROSES` → `SELESAI` → lunas / `DIBATALKAN` |
| Pembayaran | Dilakukan saat **Mulai Cuci** di Antrean. Order dengan total `0` langsung masuk `PROSES` tanpa pembayaran |
| ROYALTY | Paket **Reguler gratis**; paket lain memakai **harga ROYALTY** yang diatur admin per paket (`service_packages.royalty_price`); **add-on tetap dibayar penuh**. Selisih harga dicatat sebagai diskon/piutang |
| OJOL | Harga khusus per paket dari `service_packages.ojol_price`; jika kosong pakai harga normal. **Add-on tetap dibayar penuh**. Jika ROYALTY dan OJOL sama-sama aktif, **ROYALTY yang dipakai** |
| Nama kendaraan | Klien mengirim `vehicleName` (contoh: Avanza); disimpan ke `vehicles.brand` |
| Durasi cuci | Tidak dipakai klien; kolom `duration_min` tetap ada dengan default `0` |
| Hapus data | Penghapusan bersifat **soft delete** (`active = false`) lewat API |
| Harga | Master boleh berubah, harga transaksi tidak (`price_snapshot` di `order_items`) |
| Pajak | Default 0%, configurable per outlet; dihitung dari subtotal setelah diskon ROYALTY/OJOL |
| Idempotensi | `orders.client_id` UNIQUE — pengiriman ulang tidak menghasilkan transaksi ganda |
| PIN | Diperlakukan sebagai password (minimal 6 karakter) |

Seed hanya membuat **satu akun demo**: `admin@pos.test` / `123456` dengan nama tampilan **`testing`**, beserta satu outlet kosong. Tidak ada paket, add-on, rekening, atau transaksi contoh — semuanya diisi admin lewat API (mobile → Pengaturan). Nama outlet bisa diatur lewat env `SEED_OUTLET_NAME` (default `KYANE POS`).

---

## Stack Teknis

### Backend API

| Bagian | Pilihan |
|---|---|
| Framework | **Next.js 16 (App Router)** — khusus Route Handlers, tanpa UI |
| Struktur | `src/app/api/**` (rute API), `src/lib/**` (service, auth, db, validasi) |
| Auth | **Better Auth** (cookie session; email/PIN) |
| ORM | Drizzle ORM + drizzle-kit |
| Database | **PostgreSQL / Supabase** |
| Validasi | Zod (`src/lib/schemas.ts`) |
| Testing | Vitest + PGlite (API diuji tanpa database eksternal) |
| Deploy | Vercel |

### Mobile (`mobile/`)

| Bagian | Pilihan |
|---|---|
| Framework | Expo SDK ~58, React Native 0.88, React 19 |
| Navigasi | **React Navigation v7** — bottom tabs + native stack (bukan Expo Router) |
| Tema | **Light mode saja** (dark mode sudah dihapus) |
| State | React Context (`AuthContext`, `ThemeContext`) |
| Penyimpanan | AsyncStorage |
| Ikon | `lucide-react-native` |
| Build | `app.json`: package/bundle id `com.kyane.pos` |
| Base URL | `EXPO_PUBLIC_API_BASE_URL` saat build produksi; development memakai `localhost:3001` / `hostUri` Expo |

---

## Struktur Repo

```
.
├── prd.md                    # Spesifikasi produk + catatan implementasi terkini
├── docs/
│   ├── backend/README.md     # Kontrak API, database, setup, deployment
│   ├── qa/                   # Test plan, checklist regresi (API + mobile)
│   └── superpowers/plans/    # Arsip rencana fase (dokumen historis)
├── drizzle/                  # Migrasi database (0000–0003)
├── src/
│   ├── app/
│   │   ├── route.ts          # GET / → JSON status
│   │   └── api/**            # API Route Handlers
│   ├── lib/**                # Service layer, auth, db, validasi
│   └── proxy.ts              # CORS untuk Expo Web & origin produksi
├── mobile/                   # Aplikasi Expo/React Native (satu-satunya klien)
└── AGENTS.md
```

---

## Setup

### Prasyarat

- Node.js 20+ dan npm
- PostgreSQL / Supabase + connection string **Transaction Pooler** (`DATABASE_URL`) dan **Direct** (`DIRECT_URL`)
- Akun Vercel untuk deploy

### Environment Variables

```env
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://...:5432/postgres
BETTER_AUTH_SECRET=...              # minimal 32 karakter
BETTER_AUTH_URL=http://localhost:3001
WEB_ORIGIN=http://localhost:3001
SEED_OUTLET_NAME=Nama Outlet Anda   # opsional, dipakai saat db:seed
NODE_ENV=development
```

Untuk produksi, `BETTER_AUTH_URL` dan `WEB_ORIGIN` memakai domain backend yang di-deploy. Keduanya juga dipakai [`src/proxy.ts`](./src/proxy.ts) sebagai daftar origin CORS yang diizinkan (pisahkan dengan koma bila ada beberapa origin). Gunakan `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app` saat build Expo.

> **Catatan port:** di mesin ini port `3000` dipakai proyek lain, sehingga backend POS berjalan di `3001`. Nilai ini tersinkron di `.env.local` (`BETTER_AUTH_URL`, `WEB_ORIGIN`) dan base URL development mobile. Jalankan backend dengan `npm run dev -- -p 3001`.

### Migrasi & seed

```bash
npm install

# drizzle.config.ts membaca DIRECT_URL dari environment shell,
# bukan dari .env.local otomatis:
set -a; source .env.local; set +a
npm run db:migrate

npm run db:seed     # tsx --env-file=.env.local (env dimuat sendiri)
```

### Menjalankan backend

```bash
npm run dev -- -p 3001   # API di http://localhost:3001 (tanpa UI)
```

Cek cepat: `curl http://localhost:3001/` → JSON status; `curl http://localhost:3001/api/health` → health check.

### Menjalankan mobile

```bash
cd mobile
npx expo start       # Expo Go / web preview http://localhost:8081
```

- Development: base URL `localhost:3001` di Expo Web (cookie `SameSite=Lax` ikut terkirim); di native diambil dari `hostUri` Expo dengan fallback LAN `http://192.168.101.4:3001` (update jika IP berubah).
- CORS untuk Expo Web ditangani [`src/proxy.ts`](./src/proxy.ts), termasuk preflight `OPTIONS`.
- Produksi: set `EXPO_PUBLIC_API_BASE_URL` sebelum build/EAS update agar aplikasi mengarah ke backend Vercel.

---

## Deploy (Vercel + Supabase)

1. Buat project Supabase; isi `DATABASE_URL` (transaction pooler) dan `DIRECT_URL` (direct connection) di Vercel **Environment Variables**.
2. Isi juga `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://<backend>.vercel.app`, `WEB_ORIGIN=https://<backend>.vercel.app`, dan `NODE_ENV=production`. Tambahkan origin Expo lain ke `WEB_ORIGIN` bila perlu (comma-separated).
3. Jalankan migrasi dengan koneksi **direct**: `set -a; source .env.local; set +a; npm run db:migrate`, lalu `npm run db:seed` dan ganti PIN demo `123456` sebelum produksi.
4. Deploy backend ke Vercel; verifikasi `GET /` mengembalikan JSON status dan `GET /api/health` → 200.
5. Build Expo dengan `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app`, lalu distribusikan via EAS build/update.

---

## Verifikasi

| Perintah | Hasil terkini |
|---|---|
| `npm test` | 27 file, **119 test lulus** |
| `npx tsc --noEmit` (root) | Bersih |
| `npx tsc --noEmit` (mobile) | Bersih |
| `npx expo-doctor` | **20/20** |

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`prd.md`](./prd.md) | PRD + catatan perbedaan implementasi terkini |
| [`docs/backend/README.md`](./docs/backend/README.md) | Kontrak API, skema & migrasi, seed, setup, deployment |
| [`docs/qa/test-plan.md`](./docs/qa/test-plan.md) | Strategi & environment pengujian (API + mobile) |
| [`docs/qa/regression-checklist.md`](./docs/qa/regression-checklist.md) | Checklist regresi backend API & mobile |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Aturan kontribusi, termasuk commands mobile |
| [`mobile/AGENTS.md`](./mobile/AGENTS.md) | Aturan pengembangan aplikasi mobile |

---

## Lisensi

Hak cipta terpelihara.
