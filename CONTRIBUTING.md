# Kontribusi

Terima kasih sudah membantu membangun **POS Cuci Steam**. Panduan ini menjelaskan cara menjalankan, mengubah, dan mengirim kontribusi ke repo ini.

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
cp .env.example .env.local   # isi DATABASE_URL, BETTER_AUTH_SECRET, dll
npm run dev
```

Pastikan `.env.local` **tidak** ikut ter-commit — sudah tercakup di `.gitignore`.

---

## Alur Kerja

### 1. Buat branch

Jangan commit langsung ke `main`. Selalu mulai dari branch:

```bash
git checkout -b feat/nama-fitur        # fitur baru
git checkout -b fix/masalah-kecil      # perbaikan bug
git checkout -b docs/nama-dokumen      # dokumentasi
```

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

> Script di atas tersedia sejak Fase F1 (Fondasi) selesai. Sampai saat itu, repo hanya berisi dokumen.

### 4. Push dan buka Pull Request

```bash
git push -u origin feat/nama-fitur
```

Buka Pull Request menuju branch `main` di GitHub. Isi deskripsi dengan **apa yang diubah** dan **bagaimana cara memverifikasinya**, lalu minta review ke `Najwan48` atau `irgifebry`.

---

## Aturan Kode

Aturan ini berasal dari `Global Constraints` pada [Rencana 01](./docs/superpowers/plans/2026-10-20-01-fondasi.md) dan berlaku untuk semua kontribusi.

| # | Aturan |
|---|---|
| 1 | Bahasa UI dan pesan error: **Bahasa Indonesia**. Nama variabel dan kode: **English**. |
| 2 | Format angka: Rupiah tanpa desimal (`Rp 65.000`). Tanggal: `dd/MM/yyyy`. |
| 3 | **Harga adalah integer Rupiah** — bukan float, bukan sen. Tidak ada nilai desimal di tabel transaksi. |
| 4 | **Tidak ada hardcoding nilai bisnis di kode.** Paket, add-on, pajak, bank, gaji harian, dan aturan lain dibaca dari database lewat Pengaturan. |
| 5 | Akses database **hanya lewat server** (Route Handler atau server component). `SUPABASE_SERVICE_ROLE_KEY` tidak boleh muncul di kode client. |
| 6 | Nama tabel Postgres **snake_case**; nama properti Drizzle **camelCase**. |
| 7 | Satu sumber kebenaran untuk skema: `src/lib/db/schema.ts`. Migrasi lewat `drizzle-kit generate` ke folder `drizzle/`. |
| 8 | Setiap endpoint yang mengubah data sensitif wajib mencatat `audit_logs` (aktor, aksi, sebelum dan sesudah). |
| 9 | Test API **tidak boleh** butuh database eksternal — pakai PGlite. |
| 10 | Versi dependency **di-pin** (tanpa `^` atau `~`) di `package.json`. |
| 11 | Otorisasi ditegakkan di **Route Handler**, bukan di halaman. |
| 12 | Validasi pakai **Zod** di `src/lib/schemas.ts` — file yang sama dipakai server dan client. |

### Struktur layer

```
src/app/**            # Route Handler + halaman. Tipis: parsing, auth, panggil service
src/lib/services/**   # Logika bisnis. Menerima `db` sebagai argumen
src/lib/schemas.ts    # Skema Zod (sumber tunggal validasi)
src/components/**     # Komponen UI
```

Dua aturan pokok: **halaman tidak boleh berisi logika bisnis**, dan **service tidak boleh bergantung pada `next/headers`**.

---

## Testing

- Test API: **PGlite** (Postgres in-memory) — tidak butuh Supabase.
- Assertion memakai Testing Library, mock network dengan MSW.
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

- Ada nilai bisnis yang di-hardcode (harga paket, pajak, tarif gaji).
- `SUPABASE_SERVICE_ROLE_KEY` atau kredensial lain bocor ke kode client atau ke commit.
- Test bergantung pada database eksternal.
- Skema diubah langsung di file SQL hasil migrasi, bukan lewat `drizzle-kit generate`.
- Versi dependency naik tanpa alasan yang jelas (pakai `npm install <paket>@<versi>` agar ter-pin).
- Format commit tidak mengikuti Conventional Commits.
