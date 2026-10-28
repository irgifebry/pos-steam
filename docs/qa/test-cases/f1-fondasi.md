# Test Case — F1 Fondasi

| | |
|---|---|
| **Fase** | F1 — Fondasi |
| **Sumber** | `prd.md` §4–§11, Rencana 01, README |
| **Status implementasi** | Belum dimulai saat dokumen ini dibuat |
| **Eksekutor** | QA |
| **Environment** | Local / Vercel Preview |

## Cara Pakai

- Jalankan sesuai urutan modul.
- Perbarui kolom **Status**: `⬜ Belum`, `🟨 Sedang`, `✅ Lulus`, `❌ Gagal`, `⛔ Blocked`, `➖ N/A`.
- Setiap `❌` wajib punya issue bug dan mencantumkan ID test case ini.
- Untuk test otomatis, lampirkan output perintah. Untuk UI, lampirkan screenshot/video bila gagal.
- Catat device/browser pada issue jika kegagalan hanya terjadi di perangkat tertentu.

---

## Smoke Test (Wajib Setiap PR)

| ID | P | Tipe | Skenario | Hasil yang diharapkan |
|---|---|---|---|---|
| F1-001 | P0 | A | `GET /api/health` | 200, `{ status: "ok", timestamp: <ISO> }` |
| F1-002 | P0 | A | `npm run typecheck && npm run lint && npm test && npm run build` | Semua exit 0; tidak ada test skip |
| F1-030 | P0 | A | Signup user baru | Role default `kasir`, `active=true`, `dailyRate=0` |
| F1-033 | P0 | M | Login email + PIN valid/salah | Valid masuk; salah ditolak dengan pesan Indonesia |
| F1-035 | P0 | A | Endpoint terproteksi tanpa sesi | 401 `UNAUTHENTICATED` |
| F1-042 | P0 | A | Matriks RBAC utama | Kasir tidak bisa menulis master data/user |
| F1-050 | P0 | M/A | Buat paket lalu lihat daftar | 201; tampil dengan harga `Rp 35.000` |
| F1-070 | P0 | A | BottomNav per role | Admin 5 tab; kasir/operator tanpa Pengaturan |
| F1-091 | P0 | M | Login admin seed | `admin@pos.test` / `admin123` berhasil |
| F1-094 | P0 | M | Cek secret di repo/bundle | Tidak ada service key/DB URL/OAuth secret |

---

## Modul 1 — Build, Tooling, dan Health

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F1-001 | P0 | A | Panggil `GET /api/health`. | 200; body `{ status: "ok", timestamp: string ISO }`; tidak butuh auth. | ⬜ |
| F1-002 | P0 | A | Jalankan `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` dari clean clone. | Semua exit 0; tidak ada test skip; build produksi sukses. | ⬜ |
| F1-003 | P1 | A | Periksa `package.json`; jalankan `npm ci` dari clean clone. | Semua dependency dipin (tanpa `^`/`~`); install reproducible. | ⬜ |
| F1-004 | P1 | M | Buka `/` tanpa sesi; lalu buka `/kasir` tanpa sesi. | `/` redirect ke `/kasir`; tanpa sesi diarahkan ke `/login`; tidak ada redirect loop. | ⬜ |
| F1-005 | P1 | A | Hapus salah satu env wajib (mis. `BETTER_AUTH_SECRET`), jalankan fungsi yang memanggil `getEnv()`. | Error jelas menyebut nama env; fail-fast; tidak ada nilai secret di log. | ⬜ |
| F1-006 | P2 | M | Ikuti README dari clean clone: clone URL, versi Node, install, migrate, seed, dev. | Langkah bisa diikuti; catat jika URL/Node version tidak cocok. | ⬜ |

---

## Modul 2 — Skema Database & Validasi

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F1-010 | P0 | A | Setelah migrasi, query `information_schema.tables` schema `public`. | 17 tabel: `account`, `addons`, `attendance`, `audit_logs`, `cash_shifts`, `customers`, `order_items`, `orders`, `outlets`, `payroll_items`, `payroll_runs`, `payments`, `service_packages`, `session`, `user`, `verification`, `vehicles`. | ⬜ |
| F1-011 | P0 | A | Cek constraint: unique `(outlet_id, vehicle_type, name)` di `service_packages`; `(outlet_id, name)` di `addons`; `client_id` dan `(outlet_id, invoice_no)` di `orders`; `(outlet_id, period)` di `payroll_runs`; `vehicles.plate`; `user.email`; `session.token`. | Semua constraint ada; insert duplikat ditolak. | ⬜ |
| F1-012 | P0 | A | Parse/create paket dengan `price`: `0`, `-1`, `1.5`, `100_000_001`, `100_000_000`. | `0`/`-1` ditolak dengan "Harga harus lebih dari 0"; `1.5` ditolak (integer); `100_000_001` ditolak; `100_000_000` diterima. | ⬜ |
| F1-013 | P0 | A | Parse/create paket dengan `durationMin`: `0`, `-5`, `601`, `600`. | `0`/`-5`/`601` ditolak; `600` diterima. | ⬜ |
| F1-014 | P1 | A | Parse nama `"  Komplit  "`, nama 61 karakter, deskripsi 201 karakter. | Nama di-trim; >60 ditolak; deskripsi >200 ditolak. | ⬜ |
| F1-015 | P0 | A | Parse add-on dengan `vehicleTypes: []`, `["motor","mobil"]`, `["pesawat"]`. | `[]` ditolak ("Pilih minimal satu tipe kendaraan"); kombinasi valid diterima; tipe tidak valid ditolak. | ⬜ |
| F1-016 | P0 | A | Parse user: email invalid, tanpa role, `dailyRate: -1`, `dailyRate: 0`. | Email invalid ditolak; role default `kasir`; `-1` ditolak; `0` diterima. | ⬜ |
| F1-017 | P1 | A | Parse outlet: `taxPercent` `-1`, `0`, `100`, `101`, dan tanpa field. | `-1`/`101` ditolak; `0`/`100` diterima; default `0`. | ⬜ |
| F1-018 | P1 | A | Parse bank tanpa `name`, `accountNumber`, atau `accountName`. | Semua field wajib ditolak dengan pesan Bahasa Indonesia. | ⬜ |
| F1-019 | P1 | A | Parse objek minimal untuk paket, add-on, outlet, bank, user. | Default: `description=""`, `sortOrder=0`, `active=true`; add-on `unitLabel="pcs"`, `vehicleTypes=["motor","mobil"]`; outlet `taxPercent=0`; user `role="kasir"`, `dailyRate=0`, `active=true`. | ⬜ |
| F1-020 | P2 | A | Hapus outlet yang punya paket/add-on; hapus order yang punya item/payment. | FK cascade menghapus child; tidak ada orphan; perilaku sesuai schema. | ⬜ |

---

## Modul 3 — Auth, Session, dan RBAC

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F1-030 | P0 | A | `signUpEmail` user baru. | `role="kasir"`, `active=true`, `dailyRate=0`; password tidak tersimpan plaintext di tabel `user`. | ⬜ |
| F1-031 | P0 | A | Kirim payload signup dengan `role="admin"`, `active=false`, `dailyRate=999999`. | Field tersebut diabaikan (`input: false`); user tetap kasir/active/0. | ⬜ |
| F1-032 | P0 | A | Daftar/login dengan password/PIN 5 karakter dan 6 karakter. | 5 ditolak; 6 diterima. Catat konflik PRD 4 digit vs Rencana 01 6 karakter. | ⬜ |
| F1-033 | P0 | M | Login email + PIN valid; lalu PIN salah. | Valid → masuk `/kasir`; salah → pesan Bahasa Indonesia, tetap di `/login`, tidak ada sesi. | ⬜ |
| F1-034 | P1 | M | Login Google di preview/prod dengan OAuth terkonfigurasi. | Redirect Google → callback → sesi terbentuk → `/kasir`; tidak ada redirect loop; user baru default kasir. | ⬜ |
| F1-035 | P0 | A | Panggil endpoint terproteksi tanpa cookie sesi. | 401 `{ error: { code: "UNAUTHENTICATED", message: "Silakan masuk kembali" } }`. | ⬜ |
| F1-036 | P0 | A | Sesi kasir memanggil endpoint admin (POST/PATCH/DELETE packages, users). | 403 `FORBIDDEN`; tidak ada perubahan data. | ⬜ |
| F1-037 | P0 | A | Login user, lalu admin set `active=false`; coba akses dengan sesi lama dan login ulang. | Sesi lama langsung invalid (401/null); login ulang ditolak; data tidak bisa diakses. | ⬜ |
| F1-038 | P0 | M | Admin reset PIN kasir; kasir login dengan PIN lama dan baru. | PIN lama gagal; PIN baru berhasil; tidak ada PIN plaintext di DB/log. | ⬜ |
| F1-039 | P0 | A | Coba demote/deactivate satu-satunya admin aktif. | 409 `LAST_ADMIN`; role/active tidak berubah. | ⬜ |
| F1-040 | P1 | A | Periksa `Set-Cookie` saat login; tutup/buka browser; cek expiry sesi. | Cookie `httpOnly`; tidak ada token di `localStorage`; expiry ±7 hari; sesi bertahan wajar. | ⬜ |
| F1-041 | P0 | A | Kasir memanggil `GET /api/users?light=1`; admin memanggil `GET /api/users`. | Kasir hanya mendapat `{ id, name, role }`; `email`/`dailyRate` tidak ada; admin mendapat field lengkap; tanpa sesi 401. | ⬜ |
| F1-042 | P0 | A | Matriks RBAC: packages GET admin+kasir, write admin; addons GET admin+kasir, write admin; outlets GET semua, PATCH admin; banks GET semua, POST admin; settings GET semua; users semua admin (kecuali `light=1`). | Setiap sel sesuai; 401 tanpa sesi; 403 role salah; tidak ada kebocoran data. | ⬜ |
| F1-043 | P0 | A | Buat outlet kedua + data di test DB; user outlet A memanggil list packages/addons/banks/users. | Hanya data outlet A yang kembali; tidak bisa membaca/mengubah data outlet B. | ⬜ |
| F1-044 | P1 | A | Picu 400, 401, 403, 409, 500. | Envelope konsisten `{ error: { code, message } }`; pesan Indonesia; 500 tanpa stack trace/detail internal. | ⬜ |
| F1-045 | P0 | A | Build client; grep bundle untuk `SUPABASE_SERVICE_ROLE_KEY`, `pg`, `drizzle`, connection string. | Tidak ada service key/secret/DB driver di client bundle; akses DB hanya dari server. | ⬜ |

---

## Modul 4 — Master Data

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F1-050 | P0 | M/A | Admin buat paket motor `QA - Komplit`, harga 35000, durasi 30; buka daftar paket. | 201; muncul di daftar; harga tampil `Rp 35.000`; tipe Motor; status aktif. | ⬜ |
| F1-051 | P0 | A | Buat `QA - Komplit` motor lagi; lalu `QA - Komplit` mobil. | Duplikat motor → 409 `DUPLICATE`; mobil → 201 (nama sama beda tipe boleh). | ⬜ |
| F1-052 | P0 | A | Buat paket, buat order item dengan `price_snapshot`, lalu edit harga paket. | `service_packages.price` berubah; `order_items.price_snapshot` tidak berubah. E2E penuh di F2. | ⬜ |
| F1-053 | P1 | A | Nonaktifkan paket; bandingkan list default vs `includeInactive=true`; coba sebagai kasir. | Default menyembunyikan; `includeInactive` menampilkan; kasir tidak bisa menonaktifkan (403). | ⬜ |
| F1-054 | P1 | A | Buat paket `sortOrder` 2 dan 1 dengan nama berbeda; buka list. | Urut `sortOrder` asc lalu nama asc. | ⬜ |
| F1-055 | P0 | A | Buat add-on `QA - Wax` untuk mobil dan `QA - Ojek` untuk motor; filter `vehicleType=mobil`; buat duplikat nama. | Filter hanya menampilkan add-on yang berlaku; duplikat nama di outlet sama → 409. | ⬜ |
| F1-056 | P1 | M | Edit outlet: nama, alamat, HP, footer struk, pajak 11; refresh. | Perubahan tersimpan; format pajak benar; tidak ada nilai hardcoded. | ⬜ |
| F1-057 | P1 | M | Tambah bank BCA + nomor rekening + nama pemilik; edit; nonaktifkan. | Tersimpan; muncul di settings; toggle aktif bekerja; field wajib divalidasi. | ⬜ |
| F1-058 | P1 | M/A | Buka `GET /api/settings` sebagai admin dan kasir. | Admin: outlet + banks + tarif gaji default. Kasir: hanya data non-sensitif. Jika tarif gaji ikut terkirim, catat sebagai bug/klarifikasi (PRD §8). | ⬜ |
| F1-059 | P0 | M | Admin buat user kasir/operator/admin; edit role; reset PIN; nonaktifkan; lihat daftar. | Semua operasi berhasil; daftar menampilkan role/status; gaji harian hanya admin; user nonaktif tidak bisa login. | ⬜ |
| F1-060 | P1 | M | Form paket isi harga 0; submit. | Pesan "Harga harus lebih dari 0" tampil; tidak ada request POST; data tidak tersimpan. | ⬜ |
| F1-061 | P1 | M | Setelah CRUD, reload halaman dan buka form transaksi (placeholder F1). | Data tetap ada; data nonaktif tidak muncul sebagai pilihan; tidak ada duplikasi. | ⬜ |

---

## Modul 5 — UI, Shell, dan PWA

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F1-070 | P0 | A | Render `BottomNav` untuk role admin, kasir, operator. | Admin 5 tab; kasir/operator 4 tab; Pengaturan tersembunyi untuk non-admin. | ⬜ |
| F1-071 | P0 | M | Klik setiap tab; cek active state dan URL. | Navigasi benar; tab aktif terlihat; tidak ada halaman blank/error. | ⬜ |
| F1-072 | P1 | M | Cek header: nama outlet, nama user, tombol keluar, ganti operator. | Data benar; logout menghapus sesi → `/login`; ganti operator membuka panel. | ⬜ |
| F1-073 | P0 | M | Login: submit kosong; PIN <6; PIN salah; PIN valid. | Validasi client tampil; PIN <6 tidak memanggil API; error server Bahasa Indonesia; valid masuk. | ⬜ |
| F1-074 | P0 | M | Ganti operator: pilih karyawan aktif, masukkan PIN; coba PIN salah; cek karyawan nonaktif. | Sesi berganti; audit actor berubah; PIN salah error; nonaktif tidak muncul; hanya karyawan outlet sama. | ⬜ |
| F1-075 | P1 | M | Akses `/kasir` tanpa sesi; login; akses `/pengaturan` sebagai kasir. | Tanpa sesi → `/login`; setelah login → `/kasir`; kasir tidak bisa membuka `/pengaturan` (redirect/403 UI). | ⬜ |
| F1-076 | P1 | M | Periksa `manifest.webmanifest` dan `<link rel="manifest">`. | `name`, `short_name`, `start_url="/kasir"`, `display="standalone"`, `theme_color="#0F766E"`, ikon 192/512 valid. | ⬜ |
| F1-077 | P1 | M | Install PWA di Android Chrome; buka dari home screen. | Prompt install muncul; ikon/splash benar; terbuka standalone tanpa address bar. | ⬜ |
| F1-078 | P1 | M | Setelah load, cek `navigator.serviceWorker`; matikan network; reload app shell. | SW terdaftar; `sw.js` 200; shell termuat offline; tidak ada klaim data transaksi offline (itu F6). | ⬜ |
| F1-079 | P1 | M | Buka di iOS Safari 16+; login; Add to Home Screen. | Layout usable; login berhasil; PWA terbuka; catat keterbatasan Web Bluetooth (F2). | ⬜ |
| F1-080 | P2 | A | Unit test `rupiah(65000)`, `rupiah(0)`, `formatTanggal(new Date(2026, 9, 20))`. | `"Rp 65.000"`, `"Rp 0"`, `"20/10/2026"`. | ⬜ |
| F1-081 | P2 | M | Viewport 360x640, 390x844; keyboard terbuka; safe area iPhone. | Tidak ada horizontal scroll; bottom nav tidak tertutup keyboard/safe area; tap target ≥44px. | ⬜ |
| F1-082 | P2 | M | Cek label form, focus keyboard, kontras, nama aksesibel nav. | Label terhubung; focus terlihat; kontras cukup; nav bisa dibaca screen reader. | ⬜ |

---

## Modul 6 — Seed, Deploy, dan Non-Fungsional

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F1-090 | P0 | A | Jalankan `seed(db)` dua kali pada DB yang sama. | 1 outlet, 6 paket, 4 add-on, 3 bank, 1 admin; tidak ada duplikasi; tidak error. | ⬜ |
| F1-091 | P0 | M | Clean setup: migrate, seed, dev; login `admin@pos.test` / `admin123`. | Login berhasil; halaman kasir placeholder terbuka; 5 tab admin. | ⬜ |
| F1-092 | P0 | M | `npm run build`; deploy Vercel preview; buka health & login. | Build sukses; `public/sw.js` ada; health 200; login berhasil; tidak ada error runtime. | ⬜ |
| F1-093 | P1 | M | Login Google di domain preview/prod. | Redirect URI cocok; callback sukses; sesi terbentuk; tidak ada `redirect_uri_mismatch`. | ⬜ |
| F1-094 | P0 | M | Scan repo & bundle untuk secret: service key, DB URL, OAuth secret; cek `.gitignore`. | Tidak ada secret di commit/bundle; `.env.local` ignored; key hanya di server env. | ⬜ |
| F1-095 | P1 | M | Ukur API list/CRUD dan load halaman di HP mid-range, network normal; catat cold start Supabase. | API <500ms (warm); halaman <2s; cold start ±1s dicatat, bukan bug jika sesuai PRD. | ⬜ |
| F1-096 | P1 | M | Jelajahi semua layar F1; cek teks, error, Rupiah, tanggal. | Semua UI/error Bahasa Indonesia; Rupiah tanpa desimal; tanggal `dd/MM/yyyy`. | ⬜ |
| F1-097 | P1 | A | Grep kode untuk harga/pajak/gaji hardcoded (mis. `35000`, `0.11`, `50000`). | Tidak ada nilai bisnis hardcoded; semua dari DB/Pengaturan. | ⬜ |
| F1-098 | P1 | M/A | Lakukan create/update/deactivate user, reset PIN, ubah harga paket (jika diaudit). | `audit_logs` mencatat actor, action, entity, entityId, before/after, timestamp; tidak ada aksi sensitif tanpa log. | ⬜ |
| F1-099 | P1 | M | Coba nama paket `<script>alert(1)</script>`, `' OR 1=1 --`; POST cross-origin. | Teks tersimpan/escape aman; tidak ada XSS/SQLi; cross-origin ditolak; cookie `httpOnly`. | ⬜ |
| F1-100 | P2 | M | Verifikasi README, CONTRIBUTING, `.env.example`, daftar script. | Akurat dengan kode; clone URL/Node version benar; tidak ada langkah yang gagal. | ⬜ |

---

## Rekap Eksekusi

| Modul | Total | ✅ Lulus | ❌ Gagal | ⛔ Blocked | Catatan |
|---|---:|---:|---:|---:|---|
| 1 — Build & health | 6 |  |  |  |  |
| 2 — Schema & validasi | 11 |  |  |  |  |
| 3 — Auth & RBAC | 16 |  |  |  |  |
| 4 — Master data | 12 |  |  |  |  |
| 5 — UI & PWA | 13 |  |  |  |  |
| 6 — Seed & deploy | 11 |  |  |  |  |
| **Total** | **69** |  |  |  |  |

---

## Catatan Eksekusi F1

- Test case ini mengikuti Rencana 01. Jika ada perbedaan dengan PRD, lihat **§14 Test Plan — Catatan & Pertanyaan Terbuka**.
- Beberapa test case (mis. F1-052, F1-098) baru bisa dibuktikan penuh setelah F2/F7. Untuk F1, verifikasi di level service/schema dan tandai sebagai "sebagian".
- Jika implementasi F1 mengubah kontrak (mis. nama endpoint), perbarui test case ini di PR yang sama.
