# Kontribusi

Terima kasih sudah membantu membangun **POS Cuci Steam**. Repo ini berisi **backend API saja** (Next.js Route Handlers) dan klien Expo di `mobile/` — tidak ada frontend web. Panduan ini menjelaskan cara menjalankan, mengubah, dan mengirim kontribusi ke repo ini.

Semua keputusan penting soal produk ada di [`prd.md`](./prd.md). Jika Anda mengubah perilaku bisnis, **perbarui PRD lebih dulu** — PRD adalah sumber kebenaran.

---

## Prasyarat

- Node.js 20+ (LTS)
- npm atau pnpm
- Postgres untuk development lokal. Opsional: pakai **PGlite** (in-memory) yang juga dipakai untuk test.

---

## Setup Lokal

```bash
git clone https://github.com/Najwan48/pos-cuci-steam.git
cd pos-cuci-steam
npm install
# buat .env.local: DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL=http://localhost:3001, WEB_ORIGIN=http://localhost:3001
set -a; source .env.local; set +a
npm run db:migrate
npm run db:seed
npm run dev -- -p 3001   # API di http://localhost:3001 (tanpa UI)
```

Port `3001` dipakai karena `3000` dipakai proyek lain. Pastikan `.env.local` **tidak** ikut ter-commit — sudah tercakup di `.gitignore`.

---

## Alur Kerja

### 1. Kerja di `main`

Ikuti aturan di [`AGENTS.md`](./AGENTS.md): kerjakan langsung di branch `main`, buat beberapa commit kecil yang fokus, lalu push ke `origin main`. Sebelum push, cek `git status`, jalankan pemeriksaan di bawah, dan pastikan `main` sudah *up to date* dengan `origin/main`. Jangan force-push, menulis ulang history bersama, atau menghapus branch.

### 2. Commit dengan format Conventional Commits

```
<type>(<scope>): <deskripsi singkat>
```

| Type | Kapan dipakai |
|---|---|
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `docs` | Dokumentasi |
| `refactor` | Ubah struktur tanpa mengubah perilaku |
| `test` | Menambah atau memperbaiki test |
| `chore` | Build, tooling, dependency |
| `perf` | Performa |
| `build` | Build system |

Contoh:

```
feat(api): tambah endpoint CRUD paket
fix(auth): tolak sesi user nonaktif di guard route handler
docs(prd): perjelas aturan nomor invoice harian
```

### 3. Pastikan pemeriksaan lolos

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### Perubahan backend

Semua perubahan API dibuat di `src/app/api/**` (Route Handler) dan `src/lib/**` (service, auth, db, validasi). Root `/` mengembalikan JSON status; health check di `GET /api/health`. Rute tetap tipis: parsing, otorisasi, panggil service, bungkus response. Logika bisnis ada di service, dan perubahan skema wajib disertai migrasi Drizzle.

Setiap perubahan kontrak API wajib memperbarui [`docs/backend/README.md`](./docs/backend/README.md).

### Mobile (Expo)

Klien mobile berada di folder `mobile/`. Untuk menjalankan dan memeriksanya:

```bash
cd mobile && npx expo start   # jalankan dev server Expo
npx expo-doctor               # cek kesehatan environment Expo
npx tsc --noEmit              # typecheck klien mobile
```

Catatan penting:

- Mobile memakai **React Navigation**, bukan Expo Router, dan **light mode** saja.
- Development memakai backend `http://localhost:3001` (port `3000` dipakai proyek lain). Untuk produksi, set `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app` saat build/EAS update agar aplikasi mengarah ke backend yang di-deploy.
- CORS untuk Expo Web dan origin produksi ditangani `src/proxy.ts` (membaca `WEB_ORIGIN`/`BETTER_AUTH_URL`, comma-separated didukung).

### 4. Push

```bash
git push origin main
```

Perubahan langsung masuk `main`; sertakan deskripsi commit yang jelas tentang **apa yang diubah** dan cara memverifikasinya.

---

## Aturan Kode

Aturan ini berasal dari `Global Constraints` pada [Rencana 01](./docs/superpowers/plans/2026-10-20-01-fondasi.md) dan berlaku untuk semua kontribusi.

| # | Aturan |
|---|---|
| 1 | Bahasa UI dan pesan error: **Bahasa Indonesia**. Nama variabel dan kode: **English**. |
| 2 | Format angka: Rupiah tanpa desimal (`Rp 65.000`). Tanggal: `dd/MM/yyyy`. |
| 3 | **Harga adalah integer Rupiah** — bukan float, bukan sen. Tidak ada nilai desimal di tabel transaksi. |
| 4 | **Tidak ada hardcoding nilai bisnis di kode.** Paket, add-on, pajak, bank, dan aturan lain dibaca dari database lewat Pengaturan. |
| 5 | Akses database **hanya lewat Route Handler/server**. `SUPABASE_SERVICE_ROLE_KEY` tidak boleh muncul di kode client. |
| 6 | Nama tabel Postgres **snake_case**; nama properti Drizzle **camelCase**. |
| 7 | Satu sumber kebenaran untuk skema: `src/lib/db/schema.ts`. Migrasi lewat `drizzle-kit generate` ke folder `drizzle/`. |
| 8 | Setiap endpoint yang mengubah data sensitif wajib mencatat `audit_logs` (aktor, aksi, sebelum dan sesudah). |
| 9 | Test API **tidak boleh** butuh database eksternal — pakai PGlite. |
| 10 | Versi dependency **di-pin** (tanpa `^` atau `~`) di `package.json`. |
| 11 | Otorisasi ditegakkan di **Route Handler** (`src/app/api/**`), bukan di klien. |
| 12 | Validasi pakai **Zod** di `src/lib/schemas.ts` — satu sumber kebenaran untuk server. |

### Struktur layer

```
src/app/api/**        # API Route Handler. Tipis: parsing, auth, panggil service
src/lib/services/**   # Logika bisnis. Menerima `db` sebagai argumen
src/lib/schemas.ts    # Skema Zod (sumber tunggal validasi)
src/proxy.ts          # CORS untuk Expo Web & origin produksi
mobile/               # Klien Expo/React Native (satu-satunya UI)
```

Dua aturan pokok: **Route Handler tidak boleh berisi logika bisnis**, dan **service tidak boleh bergantung pada `next/headers`**.

---

## Testing

- Test API: **PGlite** (Postgres in-memory) — tidak butuh Supabase.
- Cakupan terkini: 27 file / 111 test (`npm test`), termasuk test CORS `src/proxy.test.ts`.
- Setiap service layer idealnya punya test untuk kasus sukses, input tidak valid, dan kasus yang akan menggigit pengguna nyata (lihat *Review Focus* pada rencana implementasi).
- Rencana pengujian, test case per fase, dan checklist regresi ada di [`docs/qa/`](./docs/qa/). QA memakai dokumen tersebut saat review PR; developer wajib memastikan smoke test di checklist regresi lolos sebelum meminta review.

---

## Dokumentasi

- Perubahan perilaku bisnis → perbarui `prd.md`.
- Perubahan rencana implementasi → perbarui file di `docs/superpowers/plans/`.
- Perubahan cara pakai atau setup → perbarui `README.md`.

---

## Kontribusi yang Akan Ditolak

Kontribusi ditolak atau diminta revisi bila:

- Ada nilai bisnis yang di-hardcode (harga paket, pajak).
- `SUPABASE_SERVICE_ROLE_KEY` atau kredensial lain bocor ke kode client atau ke commit.
- Test bergantung pada database eksternal.
- Skema diubah langsung di file SQL hasil migrasi, bukan lewat `drizzle-kit generate`.
- Versi dependency naik tanpa alasan yang jelas (pakai `npm install <paket>@<versi>` agar ter-pin).
- Format commit tidak mengikuti Conventional Commits.
