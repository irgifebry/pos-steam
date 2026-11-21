# POS Cuci Steam Motor & Mobil

Sistem **Point of Sale** untuk outlet cuci steam (motor & mobil). Operasional dijalankan dari dua klien: **aplikasi web Next.js** dan **aplikasi mobile Expo/React Native**. Keduanya memakai backend dan database yang sama.

| | |
|---|---|
| **Produk** | Sistem Point of Sale untuk outlet cuci steam (motor & mobil) |
| **Status** | Backend stabil; frontend web & mobile aktif dikembangkan |
| **Tanggal mulai** | 20 Oktober 2026 |
| **Dokumen spesifikasi** | [`prd.md`](./prd.md) — lihat juga catatan implementasi terkini di bagian atas |
| **Terakhir diperbarui** | 21 November 2026 |

---

## Klien yang tersedia

| Klien | Lokasi | Catatan |
|---|---|---|
| **Web** | `src/app` | Next.js 16 App Router. Halaman: `/kasir`, `/antrean`, `/laporan`, `/karyawan`, `/pengaturan/*`, struk publik `/r/[token]` |
| **Mobile** | [`mobile/`](./mobile/) | Expo SDK ~58 + React Navigation v7. Empat tab: **Kasir, Antrean, Laporan, Pengaturan** |

> Tab **Karyawan/Absensi** sengaja **tidak ada di mobile** — pengelolaan karyawan dilakukan lewat web dan/atau Pengaturan → Pengguna di mobile.

Keduanya memanggil API yang sama. Untuk web preview mobile (`localhost:8081` → `localhost:3000`), backend memasang header CORS lewat [`src/proxy.ts`](./src/proxy.ts) (Next.js 16 Proxy, pengganti `middleware.ts`).

---

## Fitur

| # | Modul | Ringkasan |
|---|---|---|
| 1 | **Kasir** | Pilih paket & add-on, plat nomor, **nama kendaraan** (contoh: Avanza, Fortuner), catatan, opsi **ROYALTY**, lalu buat antrean |
| 2 | **Pembayaran di Antrean** | Pembayaran tunai/transfer dilakukan saat menekan **Mulai Cuci** di papan antrean, bukan di awal saat membuat order |
| 3 | **Papan Status Antrean** | Kartu kendaraan hari ini, filter status & jenis kendaraan, statistik Menunggu/Diproses/Selesai/Total, tombol Mulai & Selesai |
| 4 | **Laporan Omzet** | Dashboard harian, laporan omzet, metode pembayaran, paket terlaris, export **CSV & Excel (.xlsx)** |
| 5 | **Pengaturan** | Sub-halaman: Paket Layanan, Add-on, Rekening Bank, Pengguna. Data dihapus dengan tombol **Hapus**, bukan "Nonaktifkan" |
| 6 | **Karyawan & Gaji (web)** | Absensi harian, rekap bulanan, hitung gaji, slip gaji |
| 7 | **Struk digital** | Halaman struk publik `/r/[token]` dan bagikan via WhatsApp dari mobile |

### Peran pengguna

| Peran | Kemampuan |
|---|---|
| **`admin`** | Akses penuh: kasir, antrean, laporan, pengaturan, pengguna, gaji |

Seed hanya membuat **satu akun demo**: `admin@pos.test` / `123456` dengan nama tampilan **`testing`** (status belum rilis), beserta satu outlet kosong. Tidak ada paket, add-on, rekening, karyawan, atau transaksi contoh — semuanya diisi admin lewat menu Pengaturan. Nama outlet bisa diatur lewat env `SEED_OUTLET_NAME` (default `KYANE POS`).

---

## Aturan Bisnis Inti

| Area | Aturan |
|---|---|
| Nomor antrean | Per tipe kendaraan: `M-001` (Motor) / `C-001` (Mobil), reset harian |
| Nomor invoice | `S-YYYYMMDD-NNN`, unik per outlet per tanggal |
| Urutan status | `MENUNGGU` → `PROSES` → `SELESAI` → lunas / `DIBATALKAN` |
| Pembayaran | Dilakukan saat **Mulai Cuci** di Antrean. Order dengan total `0` langsung masuk `PROSES` tanpa pembayaran |
| ROYALTY | Paket **Reguler gratis**; paket lain memakai **harga ROYALTY** yang diatur admin per paket (`service_packages.royalty_price`); **add-on tetap dibayar penuh**. Selisih harga dicatat sebagai diskon/piutang |
| Nama kendaraan | Mobile mengirim `vehicleName` (contoh: Avanza); disimpan ke `vehicles.brand` |
| Durasi cuci | Tidak dipakai di mobile; kolom `duration_min` tetap ada untuk web dengan default `0` saat dibuat dari mobile |
| Hapus data | Penghapusan bersifat **soft delete** (`active = false`). Data yang ada dianggap aktif; tidak ada UI "Nonaktifkan" di mobile |
| Harga | Master boleh berubah, harga transaksi tidak (`price_snapshot` di `order_items`) |
| Pajak | Default 0%, configurable per outlet; dihitung dari subtotal setelah diskon ROYALTY |
| Idempotensi | `orders.client_id` UNIQUE — pengiriman ulang tidak menghasilkan transaksi ganda |
| PIN | Diperlakukan sebagai password (minimal 6 karakter) |

---

## Stack Teknis

### Backend & Web

| Bagian | Pilihan |
|---|---|
| Framework | **Next.js 16 (App Router)** — satu aplikasi full-stack |
| Struktur | `src/app` (rute & API route handlers), `src/lib` (server & client), `src/components` |
| UI | React 19 + TypeScript + Tailwind CSS 4 |
| API | **Next.js Route Handlers** di `src/app/api/**` |
| Auth | **Better Auth** (cookie session; email/PIN) |
| ORM | Drizzle ORM + drizzle-kit |
| Database | **PostgreSQL / Supabase** |
| Validasi | Zod (`src/lib/schemas.ts`, dipakai server & client) |
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

> Browser **tidak pernah** bicara langsung ke Supabase. Semua data lewat Route Handler; service-role key hanya ada di environment server.

---

## Struktur Repo

```
.
├── prd.md                    # Spesifikasi produk + catatan implementasi terkini
├── docs/
│   ├── backend/README.md     # Kontrak API, database, setup, batasan
│   ├── qa/                   # Test plan, test case, checklist regresi (web + mobile)
│   └── superpowers/plans/    # Arsip rencana fase (dokumen historis)
├── drizzle/                  # Migrasi database (0000–0003)
├── src/
│   ├── app/                  # Rute UI + API Route Handlers
│   ├── lib/                  # Service layer, auth, db, validasi
│   ├── components/
│   └── proxy.ts              # CORS untuk Expo Web / origin dev
├── mobile/                   # Aplikasi Expo/React Native
├── .env.example
└── AGENTS.md
```

---

## Setup

### Prasyarat

- Node.js 20+ dan npm
- PostgreSQL / Supabase + connection string **Transaction Pooler** (`DATABASE_URL`) dan **Direct** (`DIRECT_URL`)
- Akun Vercel untuk deploy (opsional untuk lokal)

### Environment Variables

```env
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://...:5432/postgres
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:3000
SEED_OUTLET_NAME=Nama Outlet Anda   # opsional, dipakai saat db:seed
```

### Migrasi & seed

```bash
npm install

# drizzle.config.ts membaca DIRECT_URL dari environment shell,
# bukan dari .env.local otomatis:
set -a; source .env.local; set +a
npm run db:migrate

npm run db:seed     # tsx --env-file=.env.local (env dimuat sendiri)
```

### Menjalankan backend & web

```bash
npm run dev          # http://localhost:3000
```

### Menjalankan mobile

```bash
cd mobile
npx expo start       # Expo Go / web preview http://localhost:8081
```

- Base URL otomatis: `localhost:3000` di web; di native diambil dari `hostUri` Expo (fallback hardcoded `http://192.168.101.4:3000` perlu diperbarui jika IP berubah).
- Ekspor `DIRECT_URL` **wajib** sebelum `npm run db:migrate`.
- CORS untuk web preview sudah ditangani `src/proxy.ts`.

---

## Verifikasi

| Perintah | Hasil terkini |
|---|---|
| `npm test` | 28 file, **116 test lulus** |
| `npx tsc --noEmit` (root) | Bersih |
| `npx tsc --noEmit` (mobile) | Bersih |
| `npx expo install --check` | Dependencies sesuai SDK |
| `npx expo-doctor` | **20/20** |

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`prd.md`](./prd.md) | PRD + catatan perbedaan implementasi terkini |
| [`docs/backend/README.md`](./docs/backend/README.md) | Status backend, kontrak API, skema & migrasi, seed, setup, batasan |
| [`docs/qa/test-plan.md`](./docs/qa/test-plan.md) | Strategi & environment pengujian (web + mobile) |
| [`docs/qa/regression-checklist.md`](./docs/qa/regression-checklist.md) | Checklist regresi web & mobile |
| [`docs/qa/test-cases/f1-fondasi.md`](./docs/qa/test-cases/f1-fondasi.md) | Test case historis F1 |
| [`docs/superpowers/plans/README.md`](./docs/superpowers/plans/README.md) | Peta arsip rencana fase |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Aturan kontribusi, termasuk commands mobile |
| [`mobile/AGENTS.md`](./mobile/AGENTS.md) | Aturan pengembangan aplikasi mobile |

---

## Lisensi

Hak cipta terpelihara.
