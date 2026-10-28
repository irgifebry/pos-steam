# POS Cuci Steam Motor & Mobil

Sistem **Point of Sale** untuk outlet cuci steam (motor & mobil). Seluruh operasional berjalan dari HP: memilih paket, mencatat pesanan, melacak status kendaraan, menerima pembayaran, mencetak struk, sampai menyusun laporan omzet dan menghitung gaji karyawan.

Mobile-first, bisa di-install ke layar utama HP (PWA), dan **tetap berfungsi saat koneksi internet hilang** di tengah shift.

| | |
|---|---|
| **Produk** | Sistem Point of Sale untuk outlet cuci steam (motor & mobil) |
| **Status** | Fase Fondasi (F1) — implementasi belum dimulai |
| **Tanggal mulai** | 20 Oktober 2026 |
| **Dokumen spesifikasi** | [`prd.md`](./prd.md) |

---

## Fitur

| # | Modul | Ringkasan |
|---|---|---|
| 1 | **Kasir & Pembayaran** | Pilih paket/add-on, data pelanggan & plat, antrean, pembayaran tunai/transfer, cetak struk + struk digital via WhatsApp |
| 2 | **Papan Status Antrean** | Kartu kendaraan hari ini, timer berjalan, filter motor/mobil, tombol Mulai & Selesai |
| 3 | **Laporan Omzet** | Dashboard harian, 6 jenis laporan, export CSV, cetak A4 |
| 4 | **Karyawan, Absensi & Gaji** | Absensi harian, rekap jam kerja, hitung gaji bulanan, slip gaji PDF |
| 5 | **Pengaturan** | Paket, add-on, outlet, bank, pengguna, atur gaji, buka/tutup kas |
| 6 | **Mode Offline** | Kasir tetap bertransaksi tanpa internet, tersinkron otomatis saat koneksi kembali |

### Peran pengguna

| Peran | Kemampuan |
|---|---|
| **Admin / Owner** | Semua fitur, termasuk Pengaturan, Harga, Kelola Karyawan, Gaji, Laporan lengkap |
| **Kasir** | Input pesanan, pembayaran, cetak struk, update status kendaraan, catat absensi, lihat laporan harian |
| **Operator** | Melihat papan status hari ini, menandai status kendaraan yang ditugaskan |

## Tim Proyek

| Akun GitHub | Peran | Tanggung jawab |
|---|---|---|
| [irgifebry](https://github.com/irgifebry) | Frontend Developer | Antarmuka dan pengalaman pengguna |
| [Najwan48](https://github.com/Najwan48) | Backend Developer | API, logika bisnis, dan database |
| [dimas22231](https://github.com/dimas22231) | QA | Pengujian dan pelaporan bug |

---

## Stack Teknis

| Bagian | Pilihan |
|---|---|
| Framework | **Next.js 16 (App Router)** — satu aplikasi full-stack |
| Struktur | `src/app` (rute & API route handlers), `src/lib` (server & client), `src/components` |
| UI | React 19 + TypeScript 5.9 + Tailwind CSS 4 |
| API | **Next.js Route Handlers** di `src/app/api/**` |
| Auth | **Better Auth** + Google OAuth + email/password + PIN untuk ganti operator |
| ORM | Drizzle ORM + drizzle-kit |
| Database | **Supabase PostgreSQL** via Transaction Pooler |
| Validasi | Zod 4 (`src/lib/schemas.ts`, dipakai server & client) |
| PWA | **Serwist** (`@serwist/next`) + IndexedDB (Dexie) untuk offline |
| State/Data | TanStack Query (server state) + Zustand (state kasir) |
| Testing | Vitest 5 + Testing Library + MSW (API diuji dengan **PGlite**) |
| Deploy | **Vercel** |
| Struk cetak | Printer thermal **Bluetooth 58mm** via Web Bluetooth — fallback: cetak via browser (A5) |

> **Akses database:** semua data lewat Route Handler, browser **tidak pernah** bicara langsung ke Supabase. RLS tetap aktif sebagai lapisan pertahanan kedua; service-role key hanya ada di environment server.

---

## Aturan Bisnis Inti

| Area | Aturan |
|---|---|
| Nomor antrean | Per tipe kendaraan: `M-001` (Motor) / `C-001` (Mobil), reset harian |
| Nomor invoice | `S-YYYYMMDD-NNN`, unik per outlet per tanggal, tidak pernah dipakai ulang |
| Urutan status | `MENUNGGU` → `PROSES` → `SELESAI` → lunas / `DIBATALKAN` |
| Batas ubah pesanan | Hanya saat status `MENUNGGU` |
| Pembatalan | Butuh alasan + audit log; hanya Admin/Kasir |
| Harga | Master boleh berubah, harga transaksi tidak (`price_snapshot` di `order_items`) |
| Pajak | Default 0%, configurable per outlet |
| Idempotensi | `orders.client_id` UNIQUE — pengiriman ulang tidak menghasilkan transaksi ganda |
| PIN | Diperlakukan sebagai password (minimal 6 karakter), ganti operator = sesi berganti |

---

## Roadmap

| Fase | Isi | Estimasi |
|---|---|---|
| **F1 — Fondasi** | Next.js App Router, Drizzle + Supabase, Better Auth + Google, master data, app shell + bottom nav, PWA | 1–2 minggu |
| **F2 — Kasir Inti** | Input transaksi, antrean, pembayaran, struk cetak + digital, buka/tutup kas | 1–2 minggu |
| **F3 — Papan Status** | Board antrean, timer, filter, layar pelanggan (opsional) | 3–5 hari |
| **F4 — Laporan** | Dashboard omzet, 6 laporan, export CSV, cetak | 3–5 hari |
| **F5 — Absensi & Gaji** | Absensi harian, rekap bulanan, hitung gaji, slip PDF | 3–5 hari |
| **F6 — Offline** | IndexedDB, service worker, antrean sync, idempotensi server | 3–5 hari |
| **F7 — Polish** | Audit log, PDF struk, validasi, empty state, error handling | 2–3 hari |

> Offline sengaja di F6 agar logika transaksi inti stabil dulu. Bila test lapangan menunjukkan sinyal sering hilang, F6 bisa naik ke F3.

---

## Struktur Repo

```
.
├── prd.md                    # Product Requirements Document (spesifikasi acuan)
├── docs/
│   └── superpowers/plans/    # Peta rencana implementasi per fase
│       ├── README.md         # Peta rencana + ketentuan yang sudah dikunci
│       └── 2026-10-20-01-fondasi.md
├── src/                      # (akan dibuat pada Fase F1)
│   ├── app/                  # Rute UI + API Route Handlers
│   ├── lib/                  # Service layer, validasi, db
│   └── components/           # Komponen UI
└── .env.example              # (akan dibuat pada Fase F1)
```

---

## Setup

> Detail setup ada di [`prd.md` §9.2](./prd.md) dan `docs/superpowers/plans/2026-10-20-01-fondasi.md`.

### Prasyarat

- Node.js 20+ dan npm/pnpm
- Supabase project (region terdekat dengan operasional) + connection string Transaction Pooler
- Google Cloud OAuth Client ID (opsional, untuk login Google)
- Vercel account (untuk deploy)

### Environment Variables

```env
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://...:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://domain-anda.com
WEB_ORIGIN=https://domain-anda.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NODE_ENV=production
```

### Menjalankan

```bash
npm install
npm run dev
```

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`prd.md`](./prd.md) | PRD lengkap:requirement, model data, kontrak API, risiko, open questions |
| [`docs/superpowers/plans/README.md`](./docs/superpowers/plans/README.md) | Peta rencana implementasi 7 fase + ketentuan yang sudah dikunci |
| [`docs/superpowers/plans/2026-10-20-01-fondasi.md`](./docs/superpowers/plans/2026-10-20-01-fondasi.md) | Rencana detail Fase F1 |

---

## Lisensi

Hak cipta terpelihara.
