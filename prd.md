# PRD — POS Cuci Steam Motor & Mobil

| | |
|---|---|
| **Produk** | Sistem Point of Sale untuk outlet cuci steam (motor & mobil) |
| **Version dokumen** | 1.0 (draft untuk review) |
| **Tanggal** | 20 Oktober 2026 |
| **Status** | Menunggu persetujuan sebelum masuk tahap implementasi |

---

## 1. Ringkasan Eksekutif

Sistem kasir (POS) untuk satu outlet cuci steam yang melayani motor dan mobil. Seluruh operasional berjalan dari HP: memilih paket, mencatat pesanan, melacak status kendaraan, menerima pembayaran, mencetak struk, sampai menyusun laporan omzet dan menghitung gaji karyawan.

Dirancang mobile-first, bisa di-install ke layar utama HP (PWA), dan **tetap berfungsi saat koneksi internet hilang** di tengah shift.

---

## 2. Latar Belakang & Masalah

Situasi saat ini:

- Alur masih **konvensional**: pelanggan datang, karyawan mencatat di buku/catatan, kendaraan dicuci, baru pembayaran di akhir.
- Sulit tahu **omzet harian** secara real-time dan rapi.
- Tidak ada **status kendaraan** yang jelas ketika pelanggan menitipkan mobil dan pergi — sulit melacak "sudah selesai belum".
- Rekap **absensi dan gaji bulanan** dikerjakan manual.
- Bukti pembayaran transfer masuk lewat WhatsApp, verifikasi masih manual dan tidak ada jejjak audit yang rapi.

Target utama: **kasir cepat, laporan omzet akurat, status kendaraan jelas, gaji terhitung otomatis.**

---

## 3. Pengguna & Peran

| Peran | Siapa | Kemampuan |
|---|---|---|
| **Admin / Owner** | Pemilik outlet (satu akun untuk semua operasional) | Semua fitur: Kasir, Antrean, Laporan, Karyawan, Pengaturan, Gaji, Harga |

> Keputusan: aplikasi memakai **satu peran (Admin)** yang mencakup seluruh kemampuan. Tidak ada pemisahan Kasir/Operator; semua pengguna terautentikasi memiliki akses penuh. Role-based access control pada endpoint dihapus; yang tersisa hanya verifikasi sesi (authenticated).

---

## 4. Lingkup

### 4.1 Termasuk (In Scope)

1. **Kasir & Pembayaran** — pilih paket/add-on, data pelanggan & plat, antrean, pembayaran tunai/transfer, cetak & kirim struk
2. **Papan Status Antrean** — daftar kendaraan hari ini beserta status, waktu, estimasi
3. **Laporan Omzet** — harian, mingguan, bulanan, per paket, per add-on, per metode bayar, per karyawan, per kasir; export & cetak
4. **Karyawan, Absensi & Gaji** — pencatatan kehadiran harian, rekap jam kerja, penghitungan gaji bulanan, slip gaji
5. **Pengaturan** — paket, add-on, harga, pajak, data outlet, footer struk, pengguna, buka/tutup kas
6. **Mode offline** — kasir tetap dapat bertransaksi tanpa internet, tersinkron otomatis saat koneksi kembali

### 4.2 Tidak Termasuk (Out of Scope) — Fase Ini

- Member/loyalitas/poin (ditunda)
- Notifikasi WhatsApp otomatis (pakai yang manual dulu)
- Integrasi QRIS / payment gateway otomatis (transfer diverifikasi manual)
- Aplikasi mobile native (pakai PWA)
- Multi-outlet/multi-cabang (fase berikutnya)
- Akuntansi (journal, buku besar) — laporan hanya sampai level omzet
- Manajemen stok bahan kimia
- Suku bunga, cicilan, atau harga dinamis
- Integrasi sparepart / aksesoris

### 4.3 Anti-Goals (Apa yang akan dianggap gagal)

- Kasir butuh lebih dari **~30 detik** untuk menyelesaikan satu transaksi
- Data hilang saat sinyal internet hilang di tengah shift
- Harga paket yang **hardcoded** di kode (harus bisa diubah sendiri lewat menu Pengaturan)
- Ambigu soal siapa yang bertanggung jawab atas sebuah transaksi (harus ada jejak audit per pengguna)
- Sistem yang hanya bisa dipakai lewat laptop

---

## 5. Kebutuhan Fungsional

### 5.1 Modul 1 — Kasir & Pembayaran

**Alur utama (satu transaksi):**

1. Kasir login (Google, atau email+password untuk karyawan tanpa Google) → PIN 4 angka untuk ganti operator cepat
2. Pilih tipe kendaraan: **Motor** / **Mobil**
3. Pilih paket dari 3 tingkat yang tersedia untuk tipe tersebut
4. Tambah add-on (bisa lebih dari satu, sebagian ada qty)
5. Isi data pelanggan: nama, nomor WhatsApp, nomor plat (opsional) — boleh diisi sebagian
6. Tekan **"Simpan & masuk antrean"** → order dibuat, status `MENUNGGU`, nomor antrean terbit
7. Status berubah `MENUNGGU` → `PROSES` → `SELESAI`
8. Pelanggan membayar → pilih **Tunai** atau **Transfer**
9. Struk otomatis dicetak (printer thermal Bluetooth) + versi digital dikirim ke WhatsApp pelanggan
10. Order berstatus lunas, keluar dari antrean aktif

**Aturan & detail:**

- **Nomor antrean**: dua counters terpisah, per tipe kendaraan — Motor `M-001`, Mobil `C-001`, reset setiap hari (counter direset dari server saat login/sync)
- **Nomor invoice/struk**: `S-YYYYMMDD-NNN` (contoh `S-20261020-001`), unik per outlet per tanggal
- **Nomor plat**: unik per pelanggan; jika plat sudah ada, pilih pelanggan lama (tidak membuat duplikat)
- **Pajak**: default **tidak ada** (0%), dapat diaktifkan di Pengaturan (persentase per outlet)
- **Diskon**: default tidak ada di kasir (v1). Diskon hanya oleh Admin lewat penyesuaian
- **Perubahan paket/add-on**: hanya bisa sebelum status `PROSES`; setelah itu, ubah lewat void + order baru
- **Pembatalan (void)**: butuh alasan, hanya oleh Admin/Kasir, tercatat di audit log, nomor invoice tetap dipakai (jangan dipakai ulang)
- **Nominal tunai**: input uang diterima, sistem hitung kembalian, kembalian > 0 wajib dikonfirmasi
- **Transfer**: wajib isi **bank tujuan** (dari daftar bank di Pengaturan) dan **nomor referensi**; opsional unggah foto bukti; field "sudah dicek mutasi" dicentang manual oleh operator (dengan nama & waktu verifikasi)
- **Buka/tutup kas**: sebelum shift pertama, kasir membuka kas dengan saldo awal; saat tutup, kasir menghitung uang fisik, sistem menampilkan selisih

**Acceptance criteria:**

- [ ] Transaksi motor penuh (paket + 2 add-on + data pelanggan + bayar tunai) selesai ≤ 30 detik
- [ ] Nomor antrean motor dan mobil tidak saling bentrok
- [ ] Struk tercetak otomatis setelah pembayaran, dan bisa di-reprint dari riwayat
- [ ] Struk digital bisa dibuka di browser tanpa login (via token) dan bisa dikirim ke WhatsApp
- [ ] Pembatalan menyimpan alasan + nama petugas + timestamp, dan muncul di audit log
- [ ] Semua transaksi punya `created_by` dan timestamp yang tidak kosong
### 5.2 Modul 2 — Papan Status Antrean

- Tampilan kartu per kendaraan: nomor antrean, plat, tipe, paket, status, **waktu sejak masuk** (timer berjalan), estimasi durasi, nama pelanggan
- Filter: Semua / Motor / Mobil; tombol cepat **Mulai** (`MENUNGGU` → `PROSES`) dan **Selesai** (`PROSES` → `SELESAI`)
- Saat `SELESAI`, order masuk daftar "menunggu pembayaran" (kartu berbeda warna) sampai dibayar
- Ringkasan di atas: jumlah menunggu, sedang dicuci, selesai-bayar, total hari ini
- Update antrean: polling tiap 5 detik (cukup untuk 1 outlet, 1 shift) — tidak perlu WebSocket
- **Tampilan untuk pelanggan** (opsional, fase 1.5): layar/HP di ruang tunggu menampilkan nomor antrean + status sederhana

**Acceptance criteria:**

- [ ] Status di kasir berubah ≤ 1 detik di layar
- [ ] Timer "sejak masuk" akurat dan tidak me-reset saat refresh
- [ ] Order yang sudah dibayar langsung hilang dari daftar aktif

### 5.3 Modul 3 — Laporan Omzet

**Dashboard (harian, di layar utama Kasir):**
- Omzet hari ini, jumlah transaksi, rata-rata per transaksi
- Rincian tunai vs transfer
- Jumlah motor vs mobil

**Laporan (halaman Laporan):**
- Omzet per periode: harian, mingguan, bulanan — dengan grafik tren
- Rekap per paket (paket mana yang paling laku) + per add-on
- Rekap per metode pembayaran
- Rekap per karyawan (berapa transaksi, total omzet)
- Rekap kas harian: saldo awal, masuk, keluar, saldo akhir teori, aktual, selisih
- Filter tanggal, filter tipe kendaraan, filter metode bayar
- **Export** ke CSV/Excel, dan **cetak** ke PDF/Printer A4

**Acceptance criteria:**

- [ ] Omzet di dashboard cocok dengan jumlah transaksi (rekonsiliasi 100%)
- [ ] Filter periode bebas (tanggal, rentang tanggal, bulan)
- [ ] Export CSV terbuka dengan benar di Excel (UTF-8, separator sesuai lokal)
- [ ] Laporan bisa dibuka oleh Admin dan Kasir; Slip gaji hanya Admin

### 5.4 Modul 4 — Karyawan, Absensi & Gaji

**Absensi (dicatat oleh kasir, bukan self-absen):**
- Kasir memilih tanggal, lalu untuk setiap karyawan menetapkan status hari itu: **Hadir / Izin / Sakit / Alpha / Cuti**
- Opsional: jam masuk & jam keluar (untuk rekap jam kerja)
- Data absensi bisa diubah Admin di hari yang sama / koreksi

**Rekap bulanan:**
- Jumlah hari hadir, izin, sakit, alpha per karyawan per bulan
- Total jam kerja (dari jam masuk/keluar), jumlah lembur bila lembur melebihi batas yang ditentukan

**Gaji:**
- Struktur: **gaji per bulan** (bukan komisi per cucian)
- Komponen v1: `gaji_pokok_harian × jumlah_hari_hadir` + `tunjangan` (opsional) + `lembur` (opsional) − `potongan` (opsional, misal kasbon)
- Konfigurasi: rate harian, tunjangan bulanan, batas jam lembur, tarif lembur — di Pengaturan
- **Slip gaji**: bisa dihitung, disimpan sebagai "payroll run" (status draft/finalize), dicetak/diunduh PDF per karyawan
- Setelah di-finalize, slip menjadi read-only (riwayat bisa dibuka lagi)

**Acceptance criteria:**

- [ ] Kasir bisa mencatat kehadiran semua karyawan untuk satu tanggal dalam ≤ 1 menit
- [ ] Gaji bulan X = rekap absensi bulan X, terhitung otomatis
- [ ] Slip gaji bisa di-print dan diunduh sebagai PDF
- [ ] Slip yang sudah di-finalize tidak bisa diedit
- [ ] Setiap perubahan absensi tercatat di audit log

### 5.5 Modul 5 — Pengaturan

- **Paket**: nama, tipe kendaraan, harga, estimasi durasi (menit), deskripsi, urutan tampil, aktif/nonaktif
- **Add-on**: nama, harga, satuan (pcs/ban/seksi/lainnya), tipe kendaraan, aktif/nonaktif
- **Outlet**: nama, alamat, nomor HP, catatan footer struk, persen pajak, logo (opsional)
- **Bank**: daftar bank untuk pembayaran transfer
- **Pengguna**: tambah/edit karyawan, peran, PIN, reset PIN, nonaktifkan
- **Gaji**: rate harian, tunjangan, aturan lembur
- **Kas**: buka/tutup kas dan daftar riwayat

### 5.6 Modul 6 — Mode Offline (Wajib)

**Skenario:** sinyal internet hilang di area cucian / Wi-Fi down, kasir harus tetap bisa jualan.

**Mekanisme:**

1. Semua master data (paket, add-on, bank, nama karyawan) **di-cache** di HP (IndexedDB) saat login/sync — sehingga pilihan paket & harga tetap tersedia offline
2. Pembuatan order, update status, dan pembayaran **ditulis lebih dulu ke penyimpanan lokal** dengan `client_id` (UUID buatan client) dan status `pending`
3. Worker background mengirim batch ke server saat koneksi tersedia; retry otomatis dengan backoff
4. Server bersifat **idempotent**: `client_id` unik, jadi pengiriman ulang tidak menghasilkan transaksi ganda
5. Nomor invoice dibuat di client dari counter lokal (seed dari counter server saat terakhir sync). Bila terjadi bentrok (sangat jarang, hanya 1 kasir), server memberi nomor baru dan client mengikuti
6. Master data & laporan butuh online; yang **wajib jalan offline** hanya: input pesanan, status, pembayaran, cetak struk
7. UI menampilkan indikator koneksi: **Online / Offline (n pending)** — jumlah pending terlihat jelas agar tidak ada transaksi yang lolos tanpa sinkron

**Acceptance criteria:**

- [ ] Dengan airplane mode aktif, kasir bisa membuat order, memproses, membayar, dan mencetak struk
- [ ] Setelah koneksi kembali, semua transaksi pending tersinkron otomatis tanpa duplikasi
- [ ] Angka "n pending" terlihat di header, dan menjadi 0 setelah sinkron
- [ ] Master data offline sama persis dengan yang tersinkron terakhir (harga paket)

---

## 6. Aturan Bisnis (Ringkasan)

| Area | Aturan |
|---|---|
| Voucher/promo | Tidak ada di fase 1 |
| Harga paket | 3 tingkat per tipe kendaraan (motor & mobil) + add-on terpisah, semua configurable |
| Estimasi durasi | per paket (menit) → dipakai untuk estimasi selesai di papan status |
| Nomor antrean | per tipe (M-/C-), reset harian |
| Nomor invoice | `S-YYYYMMDD-NNN`, unik per outlet per tanggal, tidak pernah dipakai ulang |
| Urutan status | `MENUNGGU` → `PROSES` → `SELESAI` → (lunas) / `DIBATALKAN` |
| Batas ubah pesanan | hanya saat status `MENUNGGU` |
| Pembatalan | butuh alasan + audit log; hanya Admin/Kasir |
| Pembayaran | tunai (dengan hitung kembalian) atau transfer (verifikasi manual + bank tujuan + nomor ref) |
| Pajak | default 0%, configurable per outlet |
| Diskon | tidak ada di kasir fase 1 |
| Absensi | dicatat kasir; status hari: Hadir/Izin/Sakit/Alpha/Cuti; opsional jam masuk/keluar |
| Gaji | bulanan = hari hadir × rate harian + tunjangan + lembur − potongan; slip finalized = read-only |
| Retensi data | transaksi dan absensi disimpan permanen; tidak ada auto-delete |

---

## 7. Model Data (Ringkasan)

```
outlet ──┬── service_packages (tipe: motor|mobil, harga, durasi_menit)
         ├── addons (harga, satuan, tipe)
         ├── customers ── vehicles (plat unik, tipe, merek, warna)
         ├── orders ──┬── order_items (paket/addon, harga_snapshot, qty)
         │            └── payments (tunai|transfer, bank, ref, bukti, verifier)
         ├── attendance (tanggal, status, jam_masuk, jam_keluar, dicatat_oleh)
         ├── payroll_runs (periode, status) ── payroll_items (per karyawan, rincian)
         ├── cash_shifts (saldo_awal, saldo_akhir, selisih)
         └── audit_logs (aksi, entitas, before/after, oleh siapa)
```

Detail penting:

- `order_items` menyimpan **snapshot** nama & harga paket saat transaksi — kalau harga berubah di Pengaturan, transaksi lama tetap menampilkan harga lamanya
- `orders.client_id` UNIQUE — kunci idempotensi sinkron offline
- `users` (Better Auth) + kolom tambahan: `role`, `phone`, `pin_hash`, `outlet_id`, `active`
- `audit_logs` untuk semua aksi sensitif: void, ubah harga, ubah absensi, finalize gaji, edit pengguna

---

## 8. Struktur Menu (Navigasi)

Bottom tab bar (mobile-first), 5 menu:

```
[ Kasir ]  [ Antrean ]  [ Laporan ]  [ Karyawan ]  [ Pengaturan ]
```

- **Kasir**: input transaksi (default saat app dibuka), dashboard omzet hari ini, riwayat transaksi
- **Antrean**: papan status kendaraan
- **Laporan**: dashboard + 6 jenis laporan + export
- **Karyawan**: daftar karyawan, absensi harian, rekap bulanan, slip gaji
- **Pengaturan**: paket, add-on, outlet, bank, pengguna, gaji, kas (hanya Admin)

---

## 9. Arsitektur & Stack

| Bagian | Pilihan | Catatan |
|---|---|---|
| Framework | **Next.js 16 (App Router)** — satu aplikasi full-stack | satu project, satu domain, tanpa CORS |
| Struktur | `src/app` (rute & API route handlers), `src/lib` (server & client), `src/components` | |
| UI | React 19 + TypeScript 5.9 + Tailwind CSS 4 | komponen dasar buatan sendiri (Button/Input/Card) |
| API | **Next.js Route Handlers** di `src/app/api/**` | menggantikan Express; aturan bisnis tetap di server |
| Auth | **Better Auth** + Google OAuth + email/password | adapter Drizzle, plugin `nextCookies()` |
| ORM | Drizzle ORM + drizzle-kit | dipakai bersama adapter Better Auth |
| Database | **Supabase PostgreSQL** | diakses via **Transaction Pooler** (port 5432), `max` 1–5 koneksi per instance, `ssl.rejectUnauthorized: false` |
| Validasi | Zod 4 | satu file `src/lib/schemas.ts`, dipakai server & client |
| PWA | **Serwist** (`@serwist/next`) | service worker + IndexedDB (Dexie) untuk offline |
| State/Data | TanStack Query (server state) + Zustand (state kasir) | |
| Testing | Vitest 5 + Testing Library + MSW | API diuji dengan **PGlite** (Postgres in-memory), tanpa database eksternal |
| Deploy | **Vercel** (satu project) | `next build`, environment variables di Vercel |
| Struk cetak | Printer thermal **Bluetooth 58mm** via **Web Bluetooth** (Chrome Android) | fallback: cetak via browser print (A5) |
| Struk digital | halaman `/r/{token}` publik (tanpa login) + tombol "Bagikan" ke WhatsApp | |

### 9.1 Akses Database (Keputusan Penting)

**Semua akses data lewat Express API — tidak pernah langsung dari browser ke Supabase.**

Alasannya: Supabase REST + RLS dari sisi client prone bocor dan logika bisnis (harga, gaji, status) akan terpecah. Dengan lewat backend:

- RLS tetap diaktifkan sebagai lapisan pertahanan kedua (tabel aplikasi RLS minimal, deny-by-default untuk anon)
- Service-role key hanya ada di environment server, tidak pernah sampai ke HP
- Aturan bisnis (harga paket, hitung gaji, validasi status) terpusat di satu tempat

### 9.2 Environment Variables

```
DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://...:5432/postgres      # untuk migrasi, bukan runtime
SUPABASE_SERVICE_ROLE_KEY=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://domain-anda.com
WEB_ORIGIN=https://domain-anda.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NODE_ENV=production
```

> Tidak ada `VITE_API_URL` lagi — frontend dan API berada di origin yang sama, dipanggil dengan path relatif (`/api/...`).

> Catatan Supabase: plan free melakukan auto-pause saat idle, sehingga query pertama bisa lambat ±1 detik. Ini sudah diatasi oleh mode offline + cache master data, tapi tetap perlu diingat saat mengukur performa.

### 9.3 Auth Google — Setup yang Dibutuhkan

1. Google Cloud Console → *APIs & Services → Credentials → OAuth Client ID (Web application)*
2. Authorized redirect URI: `https://domain-anda.com/api/auth/callback/google`
3. Masukkan Client ID + Secret ke environment Vercel
4. Di Better Auth, daftarkan `google` sebagai social provider, dan `emailAndPassword` sebagai metode cadangan
5. Role disimpan di field tambahan tabel user; plugin `admin` dipakai untuk pembatasan akses berbasis peran
6. Login cukup **sekali per shift** (session persisten di PWA). Ganti operator di tengah shift cukup **PIN 4 angka** yang disetiap karyawan sendiri → jejak audit tetap per orang tanpa perlu logout-login Google di HP bersama
---

## 10. Kontrak API (Draft)

Semua endpoint adalah **Next.js Route Handlers** di `src/app/api/**`, dipanggil dari client dengan path relatif. Otorisasi ditegakkan di server pada setiap handler.

```
POST   /api/auth/*                                 # Better Auth handler (catch-all)

GET    /api/sync/bootstrap                         # master data + counter invoice + last cursor
POST   /api/sync/batch                             # batch transaksi offline (idempotent via client_id)

GET    /api/packages                POST   /api/packages
PATCH  /api/packages/:id            DELETE /api/packages/:id
GET    /api/addons                  POST   /api/addons
PATCH  /api/addons/:id              DELETE /api/addons/:id

GET    /api/orders                  # riwayat + filter
POST   /api/orders                  # buat order (bisa offline-sync)
GET    /api/orders/:id
PATCH  /api/orders/:id              # ubah item (hanya saat MENUNGGU)
PATCH  /api/orders/:id/status       # MENUNGGU → PROSES → SELESAI
POST   /api/orders/:id/payments     # catat pembayaran
POST   /api/orders/:id/cancel       # void + alasan

GET    /api/board                   # papan status hari ini
GET    /api/receipts/:token         # struk digital publik
GET    /api/dashboard/today

GET    /api/reports/omzet           # ?from&to&groupBy
GET    /api/reports/paket
GET    /api/reports/addon
GET    /api/reports/payment-method
GET    /api/reports/employee
GET    /api/reports/cash            # rekap kas harian
GET    /api/reports/export.csv      # ?type=...

GET    /api/attendance?date=        POST /api/attendance
GET    /api/attendance/summary?period=
GET    /api/payroll?period=         POST /api/payroll/generate
PATCH  /api/payroll/:id/finalize

GET    /api/customers               POST /api/customers
GET    /api/vehicles                POST /api/vehicles
GET    /api/settings                PATCH /api/settings
GET    /api/banks                   POST /api/banks
GET    /api/users                   POST /api/users
PATCH  /api/users/:id
GET    /api/audit-logs
```

---

## 11. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Performa | API list/CRUD < 500ms (server, koneksi normal); halaman Kasir tampil < 2 detik di HP mid-range |
| Offline | 100% fungsi kasir inti tetap jalan tanpa internet |
| Perangkat | Android 8+ (Web Bluetooth untuk printer), iOS Safari 16+ (PWA, cetak via iOS share print) |
| PWA | Bisa di-install; ikon, splash screen, theme color; prompt update |
| Keamanan | Session httpOnly cookie; password hash bcrypt/argon2; PIN hash terpisah; verifikasi sesi (authenticated) di setiap endpoint; service-role key hanya di server |
| Audit | Semua aksi void/ubah harga/ubah absensi/finalize gaji tercatat (siapa, kapan, before-after) |
| Data | Backup otomatis Supabase; export CSV bulanan per outlet |
| Skala | 1 outlet, 1 shift, 5–15 karyawan — belum perlu horizontal scaling |
| Bahasa | Bahasa Indonesia, format tanggal & angka lokal (Rupiah tanpa desimal, `dd/MM/yyyy`) |

---

## 12. Roadmap (Fase Implementasi)

| Fase | Isi | Estimasi |
|---|---|---|
| **F1 — Fondasi** | Next.js App Router, Drizzle + Supabase, Better Auth + Google, master data (paket/add-on/outlet/bank/user), app shell + bottom nav, PWA | 1–2 minggu |
| **F2 — Kasir Inti** | Input transaksi, antrean, pembayaran tunai/transfer, struk cetak + digital, buka/tutup kas | 1–2 minggu |
| **F3 — Papan Status** | Board antrean, timer, filter, layar tampil untuk pelanggan (opsional) | 3–5 hari |
| **F4 — Laporan** | Dashboard omzet, 6 laporan, export CSV, cetak | 3–5 hari |
| **F5 — Absensi & Gaji** | Absensi harian, rekap bulanan, hitung gaji, slip PDF | 3–5 hari |
| **F6 — Offline** | IndexedDB, service worker, antrean sync, idempotensi server, indikator pending | 3–5 hari |
| **F7 — Polish** | Audit log, PDF struk, validasi, empty states, error handling | 2–3 hari |

> Offline sengaja ditempatkan di F6 (bukan awal) agar logika transaksi intinya stabil dan tidak terus dirombak. Bila test lapangan menunjukkan sinyal sering hilang, F6 bisa naik ke posisi F3.

---

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Login Google merepotkan di HP bersama | Perceived lambat | Login sekali per shift + ganti operator via PIN; email/password cadangan tersedia |
| Sinyal hilang saat shift sibuk | Transaksi hilang / jualan macet | Mode offline F6 + indikator pending yang terlihat jelas |
| Nomor invoice bentrok saat offline | Struk ambigu | Counter lokal + `client_id` unik; server memvalidasi dan memperbaiki bentrok |
| Harga paket berubah di tengah hari | Omset kacau | `price_snapshot` di order_items; harga baru berlaku untuk order baru saja |
| Berhenti memakai kasir | Kembali ke buku | Kasir harus cepat — minimal 3 langkah dari buka app sampai bayar |
| Google OAuth belum terkonfigurasi | Tidak bisa login | Checklist setup ada di §9.3; akun baru bisa dibuat cepat |
| Printer Bluetooth gagal konek | Struk tidak keluar | Fallback ke cetak via browser (A5) + tombol "kirim digital" |

---

## 14. Yang Masih Perlu Diputuskan (Open Questions)

Pertanyaan berikut belum dijawab dan **punya dampak** terhadap implementasi. Sisanya bisa diputuskan saat development (nilai default dicatat di sini):

| # | Pertanyaan | Impact | Default sementara |
|---|---|---|---|
| 1 | **Nama paket & harga persis** (3 motor, 3 mobil) | Master data awal, contoh struk, laporan | Kosong — diisi lewat Pengaturan |
| 2 | **Daftar add-on & harga** | Master data awal | Kosong — diisi lewat Pengaturan |
| 3 | **Gaji pokok harian karyawan berapa?** | Perhitungan gaji | Di-set di Pengaturan |
| 4 | **Ada karyawan part-time dengan rate berbeda?** | Struktur gaji | Satu rate harian seragam; rate per karyawan bisa berbeda |
| 5 | **Ada potongan lain selain kasbon?** (izin potong gaji, dll) | Slip gaji | Potongan manual per bulan |
| 6 | **Nama bank tujuan transfer apa saja yang dipakai?** | Form pembayaran transfer | Daftar bank standar, dapat diedit |
| 7 | **Struk perlu pajak?** | Perhitungan total | 0%, configurable |
| 8 | **Nomor WhatsApp / kontak outlet?** | Struk & header | Kosong — diisi di Pengaturan |
| 9 | **Logo outlet?** | Header struk | Opsional, upload PNG |
| 10 | **Punya domain sendiri?** | URL OAuth callback & QRIS | Wajib — berdampak langsung ke setup Google OAuth |
---

## 15. Lampiran

### 15.1 Contoh Isi Struk

```
================================
        [LOGO]  NAMA OUTLET
      Jl. Contoh No. 12, Jakarta
        Telp 0812-xxxx-xxxx
================================
No. Struk   : S-20261020-001
Tgl         : 20/10/2026 14:32
Kasir       : Budi (KASIR)
--------------------------------
MOTOR  -  B 1234 XYZ

Paket
  Cuci Steam Komplit        Rp 35.000
Add-on
  Semprot Wax                    10.000
  Olak Ban (2)                   20.000
--------------------------------
Subtotal                  Rp  65.000
Pajak (0%)                     0
Total                   Rp  65.000
--------------------------------
Tunai                     Rp  70.000
Kembalian                 Rp   5.000
--------------------------------
Terima kasih atas kunjungan Anda
```

### 15.2 Tabel Paket (Template — perlu diisi)

| Tipe | Nama Paket | Harga | Estimasi (menit) |
|---|---|---|---|
| Motor | Paket 1 | ? | ? |
| Motor | Paket 2 | ? | ? |
| Motor | Paket 3 | ? | ? |
| Mobil | Paket 1 | ? | ? |
| Mobil | Paket 2 | ? | ? |
| Mobil | Paket 3 | ? | ? |

### 15.3 Tabel Add-on (Template — perlu diisi)

| Nama | Harga | Satuan | Berlaku untuk |
|---|---|---|---|
| ? | ? | pcs | Motor & Mobil |
| ? | ? | pcs | Mobil |
| ? | ? | ban | Mobil |

### 15.4 Checklist Setup sebelum Development

- [ ] Supabase project dibuat (region terdekat dengan operasional)
- [ ] Connection string Transaction Pooler + direct URL dicatat
- [ ] Google Cloud OAuth Client ID dibuat, redirect URI terisi
- [ ] Vercel project dibuat, environment variables terisi
- [ ] Domain di-point ke Vercel
- [ ] Printer thermal Bluetooth 58mm siap + spare
- [ ] Daftar paket, add-on, harga, dan data karyawan initial disiapkan
- [ ] Gaji pokok harian setiap karyawan ditetapkan