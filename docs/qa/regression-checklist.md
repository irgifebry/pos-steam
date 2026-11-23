# Regression Checklist — POS Cuci Steam

Gunakan checklist ini untuk memastikan perubahan baru tidak merusak fitur yang sudah berjalan. Centang hanya jika sudah diverifikasi, bukan hanya "sepertinya aman".

- **Smoke test:** wajib sebelum push perubahan ke `main`.
- **Regression F1 lengkap:** sebelum F1 dinyatakan selesai atau sebelum rilis besar.
- **Invariant lintas fase:** wajib dijalankan di setiap fase, karena aturan ini berlaku kumulatif.
- **Regresi Mobile (Expo):** wajib jika perubahan menyentuh `mobile/` atau kontrak API yang dipakai mobile.
- **Release checklist:** sebelum deploy ke production.

> **Role:** satu-satunya peran yang dikenal adalah `admin` (`roleSchema`). Istilah lama `kasir`/`operator` pada butir historis dibaca sebagai `admin`. Butir §1–§4 berlaku untuk backend API; check mobile ada di §5. Tidak ada klien web Next.js.

---

## 1. Smoke Test (±10 menit)

| # | Cek | Test Case | Lulus |
|---|---|---|---|
| 1 | Root `/` JSON status dan `GET /api/health` 200 | F1-001 | [ ] |
| 2 | Typecheck, lint, test (27 file/119 test), build | F1-002 | [ ] |
| 3 | Login email + PIN seed `admin@pos.test` / `123456` | F1-033 | [ ] |
| 4 | Endpoint tanpa sesi → 401 `UNAUTHENTICATED` | F1-035 | [ ] |
| 5 | Envelope error `{ error: { code, message } }` konsisten | F1-035 | [ ] |
| 6 | User nonaktif tidak bisa memakai sesi lama | F1-042 | [ ] |
| 7 | Buat paket via API dan tampil di daftar | F1-050 | [ ] |
| 8 | Buat order → nomor antrean/invoice otomatis | F2 | [ ] |
| 9 | Preflight `OPTIONS /api/*` → 204 + header CORS | proxy CORS | [ ] |
| 10 | Tidak ada secret di bundle/repo | F1-094 | [ ] |

Jika salah satu gagal: **jangan push**. Perbaiki dulu dan ulangi smoke test.

---

## 2. Regression F1 Lengkap

### 2.1 Build, Tooling, Health

- [ ] `npm run typecheck` exit 0
- [ ] `npm run lint` tanpa error
- [ ] `npm test` semua PASS, tidak ada skip
- [ ] `npm run build` sukses
- [ ] `GET /` mengembalikan JSON status (bukan redirect/halaman)
- [ ] `GET /api/health` 200
- [ ] Dependency tetap pinned (tidak ada `^`/`~`)

### 2.2 Skema & Validasi

- [ ] 18 tabel terbentuk setelah migrasi (`0000`–`0003`)
- [ ] Unique constraint `(outlet_id, vehicle_type, name)` pada `service_packages`
- [ ] Unique `(outlet_id, name)` pada `addons`
- [ ] Unique `client_id` dan `(outlet_id, invoice_no)` pada `orders`
- [ ] Harga 0/negatif/desimal ditolak
- [ ] Durasi 0/negatif/>600 ditolak
- [ ] Add-on dengan `vehicleTypes` kosong ditolak
- [ ] Email invalid ditolak
- [ ] Pajak outlet 0–100, default 0
- [ ] Default field sesuai schema

### 2.3 Auth, Session, RBAC

- [ ] Signup default `admin`, `active=true`
- [ ] Signup tidak bisa mengisi `role`/`active`
- [ ] PIN <6 ditolak, 6 diterima
- [ ] Login email + PIN valid/salah
- [ ] Tanpa sesi → 401 `UNAUTHENTICATED`
- [ ] Role salah → 403 `FORBIDDEN`
- [ ] User nonaktif tidak bisa login dan sesi lama mati
- [ ] Reset PIN bekerja; PIN lama gagal
- [ ] Admin terakhir tidak bisa di-demote/deactivate
- [ ] Cookie `httpOnly`, tidak ada token di `localStorage`
- [ ] `GET /api/users?light=1` hanya mengembalikan `id`, `name`, `role`
- [ ] Matriks RBAC semua endpoint
- [ ] Isolasi data per outlet
- [ ] Envelope error konsisten dan Bahasa Indonesia
- [ ] Service key/DB driver tidak ada di client bundle

### 2.4 Master Data (via API)

> Data master dikelola lewat endpoint `/api/packages`, `/api/addons`, `/api/outlets`, `/api/banks`, `/api/settings`, dan `/api/users`. "Hapus" = soft delete (`active=false`); daftar hanya memuat record aktif kecuali `includeInactive=true` — lihat §5 untuk check di mobile.

- [ ] Paket motor/mobil bisa dibuat, diedit, dihapus (`DELETE` → `active=false`)
- [ ] Nama sama beda tipe kendaraan diperbolehkan
- [ ] Nama sama tipe sama ditolak 409 `DUPLICATE`
- [ ] `price_snapshot` transaksi lama tidak berubah saat harga master diedit
- [ ] `royaltyPrice` tersimpan dan dipakai saat order `royalty: true`
- [ ] Urutan `sortOrder` lalu nama
- [ ] Add-on filter tipe kendaraan benar; duplikat ditolak
- [ ] Outlet (nama, alamat, HP, footer, pajak) tersimpan
- [ ] Bank (nama, nomor rekening, pemilik, aktif) tersimpan
- [ ] `GET /api/settings` mengembalikan outlet + bank aktif; field sensitif tidak bocor
- [ ] User CRUD, reset PIN, aktif/nonaktif bekerja; admin terakhir dilindungi `409 LAST_ADMIN`
- [ ] Data tersimpan di database (verifikasi ulang dengan `GET`)

### 2.5 Kontrak API & CORS

- [ ] Semua response sukses memakai `{ data: ... }`; error `{ error: { code, message } }`
- [ ] Kode error sesuai kontrak: `VALIDATION_ERROR`, `INVALID_JSON`, `OUTLET_REQUIRED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE`, `LAST_ADMIN`, `INTERNAL_ERROR`
- [ ] Root `/` mengembalikan JSON status; `GET /api/health` 200
- [ ] Preflight `OPTIONS /api/*` → 204 dengan header CORS; origin dari `WEB_ORIGIN`/`BETTER_AUTH_URL` diterima (comma-separated)
- [ ] Cookie sesi `httpOnly`; klien memakai `credentials: "include"`; tidak ada token di `localStorage`
- [ ] Pesan error Bahasa Indonesia; format Rupiah tanpa desimal di export

### 2.6 Seed, Deploy, Non-Fungsional

- [ ] Seed idempotent: **1 outlet kosong, 1 admin (`admin@pos.test` / `123456`, nama `testing`), 0 paket, 0 add-on, 0 bank, 0 transaksi**
- [ ] Clean setup: migrate (export `DIRECT_URL`) + seed + `npm run dev -- -p 3001` + login admin
- [ ] Build produksi dan Vercel preview sukses
- [ ] Tidak ada secret di repo/bundle; `.env.local` ignored
- [ ] API <500ms (warm)
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
- [ ] **Tidak ada hardcoded business value** — paket, add-on, pajak, bank dari database.
- [ ] **Otorisasi di Route Handler** — klien bukan pengganti pengecekan server.
- [ ] **Service role key hanya di server** — tidak pernah di client bundle.
- [ ] **Akses DB hanya lewat server** — klien tidak bicara langsung ke Supabase.
- [ ] **Audit log** — void, ubah harga, edit user tercatat.
- [ ] **Idempotensi `client_id`** — pengiriman ulang tidak menggandakan order (F2+).
- [ ] **Offline tidak kehilangan/menggandakan data** — uji airplane mode (F6).
- [ ] **Nomor invoice unik** — `S-YYYYMMDD-NNN`, tidak dipakai ulang.
- [ ] **Nomor antrean unik per tipe/hari** — `M-001`/`C-001`.
- [ ] **Timezone konsisten** — reset harian memakai `Asia/Jakarta`.
- [ ] **Bahasa & format** — pesan error API Indonesia; Rupiah tanpa desimal; tanggal `dd/MM/yyyy`.
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
- [ ] Regresi Mobile (Expo) §5 lulus jika rilis menyentuh `mobile/` atau kontrak API
- [ ] UAT sign-off dari PO/pemilik outlet
- [ ] Environment variables production lengkap dan benar
- [ ] `BETTER_AUTH_URL` dan `WEB_ORIGIN` sesuai domain production (origin CORS tambahan dipisah koma)
- [ ] Migrasi database sudah dijalankan dengan `DIRECT_URL`
- [ ] PIN admin seed `123456` sudah diganti di production
- [ ] Backup Supabase aktif
- [ ] Rollback plan disiapkan (commit/versi sebelumnya)
- [ ] Test summary report diperbarui

### Setelah Deploy

- [ ] `GET /` mengembalikan JSON status dan `GET /api/health` 200
- [ ] Login admin dari aplikasi Expo berhasil (mengarah ke `EXPO_PUBLIC_API_BASE_URL` produksi)
- [ ] Satu transaksi uji end-to-end (F2+)
- [ ] Struk cetak/fallback bekerja (F2+)
- [ ] Tidak ada error di log Vercel
- [ ] Indikator offline/pending tampil (F6+)
- [ ] Smoke test production selesai dan dicatat

---

## 5. Regresi Mobile (Expo)

Jalankan jika ada perubahan di `mobile/` atau pada kontrak API yang dipakai mobile. Prasyarat lokal: backend di `http://localhost:3001`, Expo Web di `http://localhost:8081` (`npm run web` dari `mobile/`), dan CORS proxy `src/proxy.ts` aktif. Untuk produksi, build Expo dengan `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app`.

### 5.1 Setup & Kesehatan

- [ ] `npx tsc --noEmit` di root dan `mobile/` bersih; `npx expo-doctor` 20/20
- [ ] `npm test` root lulus (**27 file / 119 test**)
- [ ] Expo Web `http://localhost:8081` terhubung ke backend `http://localhost:3001`
- [ ] CORS proxy (`src/proxy.ts`, matcher `/api/:path*`) aktif: preflight `OPTIONS /api/*` dari origin Expo Web balas 204 dengan header CORS; origin produksi dari `WEB_ORIGIN`/`BETTER_AUTH_URL` juga diterima (comma-separated)
- [ ] Respons sukses `{ data: ... }` dan error `{ error: { code, message } }` konsisten di endpoint yang dipakai mobile
- [ ] `GET /` mengembalikan JSON status dan `GET /api/health` 200

### 5.2 Tampilan & Navigasi

- [ ] Login email + PIN berhasil di mobile; sesi tersimpan dan tetap ada setelah reload
- [ ] Seluruh layar memakai **tema terang** (light mode only): tidak ada toggle/halaman dark mode, tidak ada warna gelap yang tertinggal
- [ ] Bottom tab tepat **4**: Kasir, Antrean, Laporan, Pengaturan
- [ ] Tidak ada tab atau halaman tambahan di luar keempat tab di mobile; manajemen pengguna ada di Pengaturan → Pengguna
- [ ] Pengaturan terbuka sebagai menu yang mengarah ke 6 sub-halaman: **Paket Layanan, ROYALTY, OJOL, Add-on, Rekening Bank, Pengguna**; tombol kembali bekerja
- [ ] Pengaturan → Pengguna **tidak menampilkan pilihan role**: semua user berperan `admin` (label "Admin")

### 5.3 Master Data Mobile

- [ ] Paket Layanan dan Add-on memakai tab kartu **Motor / Mobil**; Add-on juga punya tab **Semua** (berlaku untuk kedua tipe kendaraan)
- [ ] Form Paket Layanan mobile **tidak memiliki field durasi**; harga, `royaltyPrice`, dan `ojolPrice` tersimpan dengan benar
- [ ] Data baru aktif secara default dan langsung muncul di daftar
- [ ] Daftar hanya menampilkan record aktif; record nonaktif tidak muncul
- [ ] Aksi hapus bertuliskan **Hapus** (bukan "Nonaktifkan"), memunculkan konfirmasi destruktif, dan data benar-benar terhapus
- [ ] Add-on hanya muncul pada tab tipe kendaraan yang sesuai (`vehicleTypes`); tab "Semua" menampilkan keduanya

### 5.4 Kasir & ROYALTY

- [ ] Form Kasir memakai label **Nama Kendaraan** (mis. Avanza/Fortuner), bukan "Nama Pelanggan"; nilai dikirim sebagai `vehicleName` dan tersimpan ke `vehicles.brand`
- [ ] Toggle **Pelanggan ROYALTY** dan **Pelanggan OJOL** tersedia di Kasir
- [ ] Saat ROYALTY aktif: paket **Reguler gratis (Rp 0)**, paket lain memakai `royaltyPrice` yang dikonfigurasi admin, **add-on tetap bayar penuh**
- [ ] Selisih harga ROYALTY tercatat di backend sebagai `discount` (piutang), bukan mengubah harga master paket
- [ ] Saat OJOL aktif: paket memakai `ojolPrice` jika diisi, otherwise harga normal; **add-on tetap bayar penuh**; diskon OJOL tercatat sebagai `discount`
- [ ] Jika ROYALTY dan OJOL aktif bersamaan, **ROYALTY menang** (harga dan label diskon sesuai ROYALTY)
- [ ] Pengaturan → ROYALTY dan → OJOL menampilkan daftar paket per tipe kendaraan dan menyimpan harga khusus per paket; mengosongkan harga berarti `null`
- [ ] Tombol aksi Kasir bertuliskan **Buat antrean** dan **tidak meminta pembayaran**; order baru berstatus `menunggu`
- [ ] Ringkasan total berada di **bar mengambang di bawah** (floating), tidak mengikuti scroll
- [ ] **Subtotal disembunyikan** ketika tidak ada pajak dan tidak ada diskon ROYALTY; muncul saat ada pajak/diskon
- [ ] Modal struk bertema **terang** (light), menampilkan nomor invoice/antrean dan tombol **Bagikan struk via WhatsApp** (`Share.share`)

### 5.5 Antrean & Pembayaran

- [ ] Di Antrean, menekan **Mulai Cuci** memunculkan **modal pembayaran**; pembayaran berhasil membuat status menjadi `proses`
- [ ] Order dengan **total 0** melewati modal pembayaran dan langsung berstatus `proses`
- [ ] Membayar lewat modal tidak mengubah status menjadi `proses` jika dipicu dari aksi bayar biasa (tanpa Mulai Cuci) — status tetap sebelum aksi lanjutan
- [ ] Tab status (Semua / Menunggu / Proses / Selesai / Dibatalkan) dan filter kendaraan (Semua Kendaraan / Motor / Mobil) menyaring daftar dengan benar
- [ ] Aksi Selesai dan Batalkan pesanan (dengan alasan) bekerja dan daftar memperbarui otomatis

### 5.6 Laporan & Export

- [ ] Tab **Laporan** menampilkan tombol **Export Excel** di sebelah judul "Laporan Omzet"
- [ ] Menekan **Export Excel** membuka popup **Pilih Jangka Waktu** dengan opsi: Hari ini, 7 hari terakhir, Minggu ini, Bulan ini
- [ ] Memilih salah satu periode mengunduh file `.xlsx` dengan 6 sheet (Ringkasan, Transaksi, Paket, Add-on, Metode Pembayaran, Kas)
- [ ] Nama file mengikuti periode yang dipilih, mis. `laporan-transactions-2026-11-23.xlsx`; tombol **Batal** menutup popup tanpa mengunduh
- [ ] Di native, file dibuka lewat share sheet; di Expo Web, file langsung terunduh lewat browser
- [ ] Tombol berubah menjadi "Mengekspor…" saat request berjalan dan menampilkan alert jika gagal

### 5.7 Koneksi Produksi

- [ ] Build/EAS update memakai `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app` (bukan alamat LAN)
- [ ] Login dan sesi tetap bertahan setelah aplikasi direstart
- [ ] Permintaan ke `/api/*` dari origin produksi diizinkan CORS; preflight `OPTIONS` balas 204
- [ ] Tidak ada URL `localhost:3001` atau IP LAN yang tersisa di aplikasi produksi
- [ ] Berbagi struk dari Kasir mengirim teks (invoice, antrean, paket, plat, total) tanpa tautan web; tidak ada lagi halaman `/r/{id}`

---

## 6. Sign-off

| Fase | Tanggal | QA | Hasil | Catatan |
|---|---|---|---|---|
| Backend API |  | Dimas |  |  |
| F1 |  | Dimas |  |  |
| F2 |  | Dimas |  |  |
| F3 |  | Dimas |  |  |
| F4 |  | Dimas |  |  |
| F6 |  | Dimas |  |  |
| F7 |  | Dimas |  |  |
| Mobile (Expo) |  | Dimas |  |  |
