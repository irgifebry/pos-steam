# Regression Checklist — POS Cuci Steam

Gunakan checklist ini untuk memastikan perubahan baru tidak merusak fitur yang sudah berjalan. Centang hanya jika sudah diverifikasi, bukan hanya "sepertinya aman".

- **Smoke test PR:** wajib untuk setiap Pull Request.
- **Regression F1 lengkap:** sebelum F1 dinyatakan selesai atau sebelum rilis besar.
- **Invariant lintas fase:** wajib dijalankan di setiap fase, karena aturan ini berlaku kumulatif.
- **Release checklist:** sebelum deploy ke production.

---

## 1. Smoke Test PR (±10 menit)

| # | Cek | Test Case | Lulus |
|---|---|---|---|
| 1 | Health endpoint 200 | F1-001 | [ ] |
| 2 | Typecheck, lint, test, build | F1-002 | [ ] |
| 3 | Signup user default kasir | F1-030 | [ ] |
| 4 | Login email + PIN | F1-033 | [ ] |
| 5 | Endpoint tanpa sesi → 401 | F1-035 | [ ] |
| 6 | Kasir tidak bisa menulis master data/user | F1-042 | [ ] |
| 7 | Buat paket dan tampil di daftar | F1-050 | [ ] |
| 8 | BottomNav sesuai role | F1-070 | [ ] |
| 9 | Login admin seed | F1-091 | [ ] |
| 10 | Tidak ada secret di bundle/repo | F1-094 | [ ] |

Jika salah satu gagal: **jangan merge**. Buat bug issue dan tandai PR sebagai blocked.

---

## 2. Regression F1 Lengkap

### 2.1 Build, Tooling, Health

- [ ] `npm run typecheck` exit 0
- [ ] `npm run lint` tanpa error
- [ ] `npm test` semua PASS, tidak ada skip
- [ ] `npm run build` sukses
- [ ] `GET /api/health` 200
- [ ] Dependency tetap pinned (tidak ada `^`/`~`)
- [ ] Root redirect dan auth redirect benar

### 2.2 Skema & Validasi

- [ ] 17 tabel terbentuk setelah migrasi
- [ ] Unique constraint `(outlet_id, vehicle_type, name)` pada `service_packages`
- [ ] Unique `(outlet_id, name)` pada `addons`
- [ ] Unique `client_id` dan `(outlet_id, invoice_no)` pada `orders`
- [ ] Unique `(outlet_id, period)` pada `payroll_runs`
- [ ] Harga 0/negatif/desimal ditolak
- [ ] Durasi 0/negatif/>600 ditolak
- [ ] Add-on dengan `vehicleTypes` kosong ditolak
- [ ] Email invalid dan `dailyRate` negatif ditolak
- [ ] Pajak outlet 0–100, default 0
- [ ] Default field sesuai schema

### 2.3 Auth, Session, RBAC

- [ ] Signup default `kasir`, `active=true`, `dailyRate=0`
- [ ] Signup tidak bisa mengisi `role`/`active`/`dailyRate`
- [ ] PIN <6 ditolak, 6 diterima
- [ ] Login email + PIN valid/salah
- [ ] Login Google (jika OAuth tersedia)
- [ ] Tanpa sesi → 401 `UNAUTHENTICATED`
- [ ] Role salah → 403 `FORBIDDEN`
- [ ] User nonaktif tidak bisa login dan sesi lama mati
- [ ] Reset PIN bekerja; PIN lama gagal
- [ ] Admin terakhir tidak bisa di-demote/deactivate
- [ ] Cookie `httpOnly`, tidak ada token di `localStorage`
- [ ] `GET /api/users?light=1` tidak membocorkan email/gaji
- [ ] Matriks RBAC semua endpoint
- [ ] Isolasi data per outlet
- [ ] Envelope error konsisten dan Bahasa Indonesia
- [ ] Service key/DB driver tidak ada di client bundle

### 2.4 Master Data

- [ ] Paket motor/mobil bisa dibuat, diedit, dinonaktifkan
- [ ] Nama sama beda tipe kendaraan diperbolehkan
- [ ] Nama sama tipe sama ditolak 409
- [ ] `price_snapshot` transaksi lama tidak berubah saat harga master diedit
- [ ] Paket nonaktif tersembunyi dari list default
- [ ] Urutan `sortOrder` lalu nama
- [ ] Add-on filter tipe kendaraan benar
- [ ] Add-on duplikat ditolak
- [ ] Outlet (nama, alamat, HP, footer, pajak) tersimpan
- [ ] Bank (nama, nomor rekening, pemilik, aktif) tersimpan
- [ ] Settings mengembalikan data yang benar; field sensitif tidak bocor ke kasir
- [ ] User CRUD, reset PIN, aktif/nonaktif bekerja
- [ ] Validasi client sama dengan validasi server
- [ ] Data tetap ada setelah reload

### 2.5 UI, Shell, PWA

- [ ] Admin melihat 5 tab; kasir/operator tanpa Pengaturan
- [ ] Navigasi dan active state benar
- [ ] Header menampilkan outlet/user; logout bekerja
- [ ] Login: validasi kosong, PIN <6, PIN salah, PIN valid
- [ ] Operator switcher: daftar aktif, PIN, ganti sesi, audit actor
- [ ] Redirect unauthenticated dan akses `/pengaturan` oleh kasir
- [ ] Manifest PWA benar
- [ ] Install PWA di Android Chrome
- [ ] Service worker terdaftar; app shell offline
- [ ] iOS Safari 16+ bisa login dan install
- [ ] Format Rupiah `Rp 65.000` dan tanggal `dd/MM/yyyy`
- [ ] Layout 360x640 tanpa horizontal scroll; tap target ≥44px
- [ ] Aksesibilitas dasar (label, focus, kontras)

### 2.6 Seed, Deploy, Non-Fungsional

- [ ] Seed idempotent: 1 outlet, 6 paket, 4 add-on, 3 bank, 1 admin
- [ ] Clean setup: migrate + seed + dev + login admin
- [ ] Build produksi dan Vercel preview sukses
- [ ] Login Google di domain deploy
- [ ] Tidak ada secret di repo/bundle; `.env.local` ignored
- [ ] API <500ms (warm), halaman <2s di HP mid-range
- [ ] Semua teks/error Bahasa Indonesia
- [ ] Tidak ada nilai bisnis hardcoded
- [ ] Audit log untuk aksi sensitif
- [ ] XSS/SQLi/cross-origin dasar aman
- [ ] README/CONTRIBUTING akurat

---

## 3. Invariant Lintas Fase (Wajib Setiap Fase)

Aturan ini berasal dari PRD dan Global Constraints Rencana 01. Jangan menunggu fase tertentu untuk memverifikasinya.

- [ ] **Harga integer Rupiah** — tidak ada float/sen di tabel transaksi.
- [ ] **Price snapshot** — harga transaksi lama tidak berubah saat master berubah.
- [ ] **Tidak ada hardcoded business value** — paket, add-on, pajak, bank, gaji dari database.
- [ ] **Otorisasi di Route Handler** — UI bukan pengganti pengecekan server.
- [ ] **Service role key hanya di server** — tidak pernah di client bundle.
- [ ] **Akses DB hanya lewat server** — browser tidak bicara langsung ke Supabase.
- [ ] **Audit log** — void, ubah harga, ubah absensi, finalize gaji, edit user tercatat.
- [ ] **Idempotensi `client_id`** — pengiriman ulang tidak menggandakan order (F2+).
- [ ] **Offline tidak kehilangan/menggandakan data** — uji airplane mode (F6).
- [ ] **Nomor invoice unik** — `S-YYYYMMDD-NNN`, tidak dipakai ulang.
- [ ] **Nomor antrean unik per tipe/hari** — `M-001`/`C-001`.
- [ ] **Timezone konsisten** — reset harian memakai `Asia/Jakarta`.
- [ ] **Bahasa & format** — UI/error Indonesia; Rupiah tanpa desimal; tanggal `dd/MM/yyyy`.
- [ ] **Dependency pinned** — tidak ada `^`/`~`.
- [ ] **Test API tidak butuh DB eksternal** — memakai PGlite.
- [ ] **Skema hanya dari `src/lib/db/schema.ts`** — migrasi lewat `drizzle-kit generate`.

---

## 4. Release Checklist

### Sebelum Deploy

- [ ] Semua test case P0 lulus 100%
- [ ] Semua test case P1 lulus ≥95%
- [ ] Tidak ada bug S1/S2 terbuka
- [ ] Regression checklist fase terkait lulus
- [ ] UAT sign-off dari PO/pemilik outlet
- [ ] Environment variables production lengkap dan benar
- [ ] `BETTER_AUTH_URL` dan `WEB_ORIGIN` sesuai domain production
- [ ] Google OAuth redirect URI production benar
- [ ] Migrasi database sudah dijalankan
- [ ] Seed production tidak memakai password default
- [ ] Backup Supabase aktif
- [ ] Rollback plan disiapkan (commit/versi sebelumnya)
- [ ] Test summary report diperbarui

### Setelah Deploy

- [ ] `GET /api/health` 200
- [ ] Login admin berhasil
- [ ] Login Google berhasil
- [ ] Bottom nav sesuai role
- [ ] Satu transaksi uji end-to-end (F2+)
- [ ] Struk cetak/fallback bekerja (F2+)
- [ ] Tidak ada error di log Vercel
- [ ] Indikator offline/pending tampil (F6+)
- [ ] Smoke test production selesai dan dicatat

---

## 5. Sign-off

| Fase | Tanggal | QA | Hasil | Catatan |
|---|---|---|---|---|
| F1 |  | Dimas |  |  |
| F2 |  | Dimas |  |  |
| F3 |  | Dimas |  |  |
| F4 |  | Dimas |  |  |
| F5 |  | Dimas |  |  |
| F6 |  | Dimas |  |  |
| F7 |  | Dimas |  |  |
