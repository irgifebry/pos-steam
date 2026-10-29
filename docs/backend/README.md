# Backend — POS Cuci Steam

Dokumen ini khusus untuk **backend**: apa yang sudah dibangun, kontrak API, cara menjalankan, batasan, dan jobdesk backend developer. Untuk spesifikasi produk, tetap mengacu ke [`prd.md`](../../prd.md). Untuk aturan kontribusi umum, lihat [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

| | |
|---|---|
| **Fase** | F1–F2 — Fondasi backend + sinkronisasi transaksi (kasir, antrean, laporan, karyawan, gaji kas, struk publik) |
| **Status** | Selesai dan terverifikasi |
| **PIC Backend** | [Najwan48](https://github.com/Najwan48) |
| **Branch** | `main` |
| **Terakhir diperbarui** | 29 Oktober 2026 |

---

## 1. Ringkasan

Backend F1 menyediakan fondasi aplikasi full-stack Next.js 16:

- Database PostgreSQL via Drizzle ORM: **18 tabel**, 2 migrasi.
- Autentikasi **Better Auth**: Google OAuth + email/PIN.
- Otorisasi berbasis peran di Route Handler: `admin`, `kasir`, `operator`.
- API master data: paket, add-on, outlet, bank, settings.
- API manajemen pengguna: tambah, ubah, reset PIN, aktif/nonaktif.
- API transaksi & operasional: order, antrean, pembayaran, pembatalan, struk publik, absensi, payroll, shift kas, laporan.
- Validasi Zod sebagai sumber tunggal (`src/lib/schemas.ts`).
- Format error konsisten `{ error: { code, message } }`.
- Audit log untuk perubahan pengguna.
- Seed data idempotent untuk outlet, paket, add-on, bank, dan admin.
- Test backend dengan **PGlite** tanpa database eksternal.

**Hasil verifikasi terakhir:**

| Pemeriksaan | Hasil |
|---|---|
| `npm test` | 20 file, **100 test lulus** |
| `npm run lint` | Bersih |
| `npx tsc --noEmit` | Bersih |
| `npm run build` | Sukses, semua route API terdeteksi |

> Semua frontend (`/kasir`, `/antrean`, `/laporan`, `/karyawan`, `/pengaturan/*`, `r/[token]`) sudah tersambung ke API nyata. Mode demo, dummy data, dan fallback localStorage telah dihapus.

---

## 2. Stack backend

| Bagian | Pilihan | Versi |
|---|---|---|
| Framework | Next.js App Router | 16.4.2 |
| Bahasa | TypeScript (strict) | 5.9.3 |
| Database | PostgreSQL / Supabase | — |
| ORM | Drizzle ORM + drizzle-kit | 0.45.4 / 0.31.11 |
| Auth | Better Auth + Drizzle adapter | 1.7.12 |
| Validasi | Zod | 4.6.7 |
| Driver | `pg` | 8.23.1 |
| Test | Vitest + PGlite | 5.0.5 / 0.5.10 |
| Runtime seed | `tsx` | 4.23.15 |

Semua dependency di-`pin` tanpa `^` atau `~` sesuai aturan repo.

---

## 3. Struktur folder backend

```text
src/
  app/
    api/
      auth/[...all]/route.ts      # handler Better Auth
      health/route.ts             # health check publik
      packages/route.ts           # GET, POST paket
      packages/[id]/route.ts      # PATCH, DELETE paket
      addons/route.ts             # GET, POST add-on
      addons/[id]/route.ts        # PATCH, DELETE add-on
      outlets/route.ts            # GET, PATCH outlet
      banks/route.ts              # GET, POST bank
      settings/route.ts           # GET settings gabungan
      users/route.ts              # GET, POST pengguna
      users/[id]/route.ts         # PATCH pengguna
      users/[id]/pin/route.ts     # POST reset PIN
      users/[id]/active/route.ts  # POST aktif/nonaktif
  lib/
    auth/
      config.ts                   # konfigurasi Better Auth
      provider.ts                 # instance auth lazy + setter untuk test
      session.ts                  # getSessionUser, requireUser
      client.ts                   # (belum dibuat — frontend)
    db/
      schema.ts                   # sumber tunggal skema (18 tabel)
      client.ts                   # koneksi pg
      provider.ts                 # instance db lazy + setter untuk test
      test-db.ts                  # PGlite + migrasi untuk test
      seed.ts                     # seed idempotent
    services/
      service-packages.ts
      addons.ts
      outlets.ts
      banks.ts
      settings.ts
      users.ts
    env.ts                        # validasi environment
    http.ts                       # HttpError, jsonError, isUniqueViolation
    schemas.ts                    # semua skema Zod
    types.ts                      # tipe turunan Zod
    server-init.ts                # inisialisasi db + auth lazy
drizzle/
  0000_optimal_morlun.sql
  0001_secret_grim_reaper.sql
  meta/
```

### Pembagian layer

```text
Route Handler  ->  Service  ->  Drizzle  ->  PostgreSQL
```

- **Route Handler** hanya: inisialisasi server, cek sesi/role, parsing body/query, panggil service, bungkus response/error.
- **Service** berisi logika bisnis dan menerima `db` sebagai argumen. Service **tidak** boleh bergantung pada `next/headers` agar bisa diuji dengan PGlite.
- **Schema Zod** dipakai bersama server dan client; update schema dibuat terpisah agar PATCH tidak mereset field yang tidak dikirim.

---

## 4. Database

### 4.1 Tabel yang sudah ada (18)

| Kelompok | Tabel | Status |
|---|---|---|
| Auth | `user`, `session`, `account`, `verification` | Dipakai |
| Outlet & master data | `outlets`, `service_packages`, `addons`, `banks` | Dipakai API F1 |
| Transaksi | `customers`, `vehicles`, `orders`, `order_items`, `payments` | **Ada endpoint F2** |
| Operasional | `attendance`, `payroll_runs`, `payroll_items`, `cash_shifts` | **Ada endpoint F2** |
| Audit | `audit_logs` | Dipakai untuk perubahan pengguna dan transaksi |

### 4.2 Aturan skema

- Nama tabel dan kolom PostgreSQL: **snake_case**.
- Properti Drizzle: **camelCase**.
- ID: `text` UUID dibuat di aplikasi (`randomUUID`).
- Harga: **integer Rupiah**, bukan float.
- `updated_at` otomatis lewat `$onUpdate`.
- `order_items.price_snapshot` menyimpan harga final saat transaksi; perubahan harga master tidak mengubah transaksi lama.
- `orders.client_id` disiapkan unik untuk idempotensi offline (F6).
- Tabel transaksi dan operasional **sudah punya endpoint** (lihat bagian 6.4–6.8).

### 4.3 Migrasi

```bash
npm run db:generate   # generate migrasi dari perubahan schema.ts
npm run db:migrate    # jalankan migrasi (memakai DIRECT_URL)
```

- `drizzle.config.ts` memakai `DIRECT_URL` untuk migrasi.
- Runtime aplikasi memakai `DATABASE_URL` (pooler).
- Test memakai folder `drizzle/` yang sama lewat PGlite.

### 4.4 Tabel `banks`

Tabel `banks` ditambahkan lewat migrasi `0001_secret_grim_reaper.sql`. Rencana F1 membutuhkan service dan endpoint bank, tetapi daftar tabel di Task 3 belum memuat tabel ini. Keputusan ini sudah disepakati sebagai penyesuaian rencana.

---

## 5. Autentikasi & otorisasi

### 5.1 Metode login

| Metode | Keterangan |
|---|---|
| Google OAuth | Untuk admin/owner |
| Email + PIN | PIN diperlakukan sebagai password, minimal 6 karakter |

Konfigurasi ada di `src/lib/auth/config.ts`:

- `emailAndPassword.enabled = true`, `minPasswordLength = 6`.
- Sesi berlaku **7 hari**, diperbarui setiap **1 hari**.
- Field tambahan user: `role`, `phone`, `outletId`, `dailyRate`, `active`.
- Semua field tambahan memakai `input: false`, sehingga tidak bisa diisi dari body sign-up publik.
- `trustedOrigins` diambil dari `WEB_ORIGIN`.
- Plugin `nextCookies()` aktif di runtime, dimatikan di test.

### 5.2 Guard

| Fungsi | Perilaku |
|---|---|
| `getSessionUser()` | Mengembalikan user atau `null`. User dengan `active = false` dianggap tidak login. |
| `requireUser()` | Melempar `401 UNAUTHENTICATED` bila tidak ada sesi. |
| `requireUser(["admin"])` | Melempar `403 FORBIDDEN` bila role tidak diizinkan. |

Role yang dikenal: `admin`, `kasir`, `operator`.

### 5.3 Reset PIN

Reset PIN oleh admin:

1. Validasi PIN minimal 6 karakter.
2. Hash PIN dengan `hashPassword()` dari `better-auth/crypto`.
3. Update baris `account` dengan `providerId = "credential"`.
4. Bila belum ada, buat baris `account` baru.
5. Hapus **semua sesi** user tersebut agar sesi lama langsung mati.
6. Catat audit log `user.reset_pin`.

---

## 6. Kontrak API

Base URL lokal: `http://localhost:3000`.

### 6.1 Format response

Sukses:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Harga harus lebih dari 0"
  }
}
```

| Status | Code | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query tidak lolos Zod |
| 400 | `INVALID_JSON` | Body bukan JSON valid |
| 400 | `OUTLET_REQUIRED` | User belum terhubung ke outlet |
| 401 | `UNAUTHENTICATED` | Tidak ada sesi / sesi tidak valid |
| 403 | `FORBIDDEN` | Role tidak diizinkan |
| 404 | `NOT_FOUND` | Data tidak ditemukan |
| 409 | `DUPLICATE` | Nama/email sudah dipakai |
| 409 | `LAST_ADMIN` | Aksi akan menghilangkan admin aktif terakhir |
| 500 | `INTERNAL_ERROR` | Kesalahan server |

### 6.2 Daftar endpoint

#### Health & auth

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | Publik | Health check |
| GET/POST | `/api/auth/[...all]` | Publik | Handler Better Auth (login, logout, callback Google, session) |

Login email/PIN:

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@pos.test\",\"password\":\"admin123\"}"
```

Cookie sesi dikirim lewat header `set-cookie`. Frontend harus memakai `credentials: "include"`.

#### Paket

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/packages?vehicleType=motor\|mobil&includeInactive=true` | admin, kasir | Daftar paket, urut `sortOrder` lalu nama |
| POST | `/api/packages` | admin | Buat paket |
| PATCH | `/api/packages/:id` | admin | Ubah sebagian field |
| DELETE | `/api/packages/:id` | admin | Soft-delete (`active = false`) |

Body POST:

```json
{
  "name": "Cuci Steam Komplit",
  "vehicleType": "motor",
  "price": 35000,
  "durationMin": 30,
  "description": "Cuci + wax",
  "sortOrder": 2,
  "active": true
}
```

Aturan:

- `price` integer > 0.
- Duplikat `(outletId, vehicleType, name)` -> `409 DUPLICATE`.
- Nama sama untuk tipe kendaraan berbeda diperbolehkan.
- Harga transaksi lama tidak berubah karena memakai `price_snapshot`.

#### Add-on

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/addons?vehicleType=motor\|mobil&includeInactive=true` | admin, kasir | Filter tipe kendaraan |
| POST | `/api/addons` | admin | Buat add-on |
| PATCH | `/api/addons/:id` | admin | Ubah sebagian field |
| DELETE | `/api/addons/:id` | admin | Soft-delete |

Body POST:

```json
{
  "name": "Semprot Wax",
  "price": 10000,
  "unitLabel": "pcs",
  "vehicleTypes": ["motor", "mobil"],
  "active": true
}
```

#### Outlet

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/outlets` | admin, kasir, operator | Daftar outlet |
| PATCH | `/api/outlets` | admin | Ubah outlet milik user yang login |

Body PATCH (semua field opsional):

```json
{
  "name": "Cuci Steam Bersama",
  "address": "Jl. Contoh No. 12",
  "phone": "0812-0000-0000",
  "receiptFooter": "Terima kasih",
  "taxPercent": 0
}
```

#### Bank

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/banks` | admin, kasir, operator | Bank aktif milik outlet user |
| POST | `/api/banks` | admin | Tambah bank |

Body POST:

```json
{
  "name": "BCA",
  "accountNumber": "1234567890",
  "accountName": "Cuci Steam Bersama",
  "active": true
}
```

> Belum ada endpoint `PATCH /api/banks/:id`, walaupun service `updateBank()` sudah tersedia. Ini masuk backlog.

#### Order

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/orders?date=...&from=...&to=...&includePaid=true\|false` | admin, kasir, operator | Daftar order outlet dalam rentang tanggal; default hari ini |
| GET | `/api/orders/:id` | admin, kasir, operator | Detail order termasuk item dan pembayaran |
| POST | `/api/orders` | admin, kasir | Buat order (server menghitung total, antrean, invoice, snapshot) |
| PATCH | `/api/orders/:id/status` | admin, kasir | Ubah status `menunggu` → `proses` → `selesai` |
| POST | `/api/orders/:id/payments` | admin, kasir | Catat pembayaran pada order selesai → otomatis `paid` |
| POST | `/api/orders/:id/cancel` | admin, kasir | Batalkan order |
| GET | `/api/receipts/:token` | Publik | Struk publik berbasis UUID order (tidak perlu login) |

Body POST `/api/orders`:

```json
{
  "clientId": "uuid-opsional-untuk-idempotensi",
  "vehicleType": "motor",
  "packageId": "uuid-paket",
  "addons": [ { "addonId": "uuid-addon", "qty": 1 } ],
  "customerName": "Budi",
  "customerPhone": "08123456789",
  "plate": "B 1234 ABC",
  "payment": {
    "method": "tunai",
    "cashReceived": 33000
  }
}
```

Aturan order:

- Server otoritatif: frontend hanya mengirim `packageId`, `addonId` + `qty`, data pelanggan/kendaraan, dan payment opsional. Server menghitung total, pajak, nomor antrean, invoice, dan snapshot harga.
- Order baru selalu status `menunggu`; pembayaran saat pembuatan tetap disimpan.
- Order `selesai` dengan pembayaran otomatis menjadi `paid`; tanpa pembayaran tetap `selesai` sampai dibayar lewat endpoint payment.
- `paid` dan `dibatalkan` tidak dapat diubah/dibatalkan lagi.
- UUID order dipakai sebagai token struk publik; tidak ada kolom receipt token terpisah.

#### Absensi

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/attendance?date=YYYY-MM-DD` | admin, kasir, operator | Daftar absensi outlet pada tanggal |
| POST | `/api/attendance` | admin, kasir | Upsert absensi karyawan (tanggal + user unik) |
| GET | `/api/attendance/summary?period=YYYY-MM` | admin, kasir | Ringkasan bulanan per karyawan |

#### Payroll

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/payroll?period=YYYY-MM` | admin, kasir | Ambil payroll (draft atau final) dengan item per karyawan |
| POST | `/api/payroll` | admin | Simpan draft atau finalisasi payroll periode |

Body POST `/api/payroll`:

```json
{
  "period": "2026-10",
  "adjustments": {
    "uuid-user": { "tunjangan": 20000, "lembur": 15000, "potongan": 10000 }
  },
  "finalize": false
}
```

- `tunjangan` → kolom `allowance`, `lembur` → `overtimePay`, `potongan` → `deductions`.
- Payroll final dikunci; tidak bisa disimpan ulang setelah `final`.

#### Shift kas

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/cash-shifts` | admin, kasir, operator | Shift terbuka + riwayat 30 shift terakhir |
| POST | `/api/cash-shifts` | admin, kasir | Buka shift kas (saldo awal) |
| POST | `/api/cash-shifts/:id/close` | admin, kasir | Tutup shift; hitung kas seharusnya dari pembayaran tunai sejak dibuka |

#### Laporan

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/reports/transactions?from=...&to=...` | admin, kasir | Transaksi yang **sudah dibayar** dalam rentang, detail add-on |

#### Pengguna (query baru)

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/users?includeInactive=false\|true` | admin | Toggle sertakan pengguna nonaktif |

#### Settings (update baru)

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| PATCH | `/api/settings` | admin | Ubah `defaultDailyRate` |


| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/settings` | admin, kasir, operator | Gabungan outlet + bank aktif + `defaultDailyRate` |

Contoh response:

```json
{
  "data": {
    "outlet": { "id": "...", "name": "Cuci Steam Bersama", "taxPercent": 0 },
    "banks": [{ "id": "...", "name": "BCA", "accountNumber": "..." }],
    "defaultDailyRate": 50000
  }
}
```

`defaultDailyRate` adalah kolom eksplisit di tabel `outlets` (migrasi `0002`).

#### Pengguna

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/users` | admin | Daftar lengkap termasuk nonaktif, termasuk `dailyRate` dan `email` |
| GET | `/api/users?light=1` | admin, kasir | Ringkasan `{ id, name, role }` untuk operator switcher |
| POST | `/api/users` | admin | Buat pengguna + PIN |
| PATCH | `/api/users/:id` | admin | Ubah nama/email/role/telepon/gaji/aktif |
| POST | `/api/users/:id/pin` | admin | Reset PIN |
| POST | `/api/users/:id/active` | admin | Aktif/nonaktifkan pengguna |

Body POST:

```json
{
  "name": "Siti",
  "email": "siti@contoh.id",
  "password": "112233",
  "role": "kasir",
  "phone": "08123456789",
  "dailyRate": 50000,
  "active": true
}
```

Body reset PIN:

```json
{ "password": "998877" }
```

Body aktif/nonaktif:

```json
{ "active": false }
```

Aturan:

- `GET /api/users` hanya admin. Kasir **tidak boleh** melihat email/gaji.
- `?light=1` hanya mengembalikan `id`, `name`, `role` dan hanya untuk outlet yang sama.
- Menurunkan role admin terakhir atau menonaktifkannya -> `409 LAST_ADMIN`.
- Menonaktifkan user menghapus semua sesinya.
- Tidak ada `DELETE /api/users/:id`; gunakan endpoint aktif/nonaktif.

---

## 7. Service layer

| File | Fungsi utama | Tanggung jawab |
|---|---|---|
| `services/service-packages.ts` | `listServicePackages`, `createServicePackage`, `updateServicePackage`, `deactivateServicePackage` | CRUD paket, filter tipe, validasi harga, duplikat, soft-delete |
| `services/addons.ts` | `listAddons`, `createAddon`, `updateAddon`, `deactivateAddon` | CRUD add-on, filter tipe kendaraan, duplikat, soft-delete |
| `services/outlets.ts` | `listOutlets`, `getOutlet`, `updateOutlet` | Data outlet, konversi pajak numerik ke number |
| `services/banks.ts` | `listBanks`, `createBank`, `updateBank` | Bank aktif per outlet |
| `services/settings.ts` | `getSettings`, `updateSettings` | Gabungan outlet + bank + tarif harian default |
| `services/users.ts` | `listUsers`, `listUserSummaries`, `createUser`, `updateUser`, `resetPin`, `setUserActive` | Manajemen pengguna, proteksi admin terakhir, audit log |
| `services/orders.ts` | `createOrder`, `listOrders`, `getOrder`, `getReceipt`, `updateOrderStatus`, `addOrderPayment`, `cancelOrder` | Order, antrean, invoice, pembayaran, pembatalan, struk publik |
| `services/attendance.ts` | `listAttendance`, `saveAttendance`, `attendanceSummary` | Absensi harian dan ringkasan bulanan |
| `services/payroll.ts` | `getPayroll`, `savePayroll` | Draft/final payroll, komponen gaji, kunci final |
| `services/cash-shifts.ts` | `getCashShiftState`, `openCashShift`, `closeCashShift` | Buka/tutup shift kas, hitung kas seharusnya |
| `services/reports.ts` | `listReportTransactions` | Transaksi yang sudah dibayar, detail add-on |

Semua service menerima `db: AppDatabase` sebagai argumen pertama.

---

## 8. Validasi

Sumber tunggal: `src/lib/schemas.ts`.

| Schema | Dipakai untuk |
|---|---|
| `servicePackageInputSchema` / `servicePackageUpdateSchema` | Paket |
| `addonInputSchema` / `addonUpdateSchema` | Add-on |
| `outletInputSchema` / `outletUpdateSchema` | Outlet |
| `bankInputSchema` / `bankUpdateSchema` | Bank |
| `userInputSchema` / `userUpdateSchema` / `userCreateSchema` | Pengguna |
| `pinSchema` | PIN/reset PIN |
| `roleSchema`, `vehicleTypeSchema`, `attendanceStatusSchema` | Enum domain |
| `orderCreateSchema`, `orderStatusSchema`, `orderCancelSchema`, `orderPaymentInputSchema` | Order |
| `attendanceSaveSchema`, `attendanceSummaryQuerySchema` | Absensi |
| `payrollSaveSchema`, `payrollAdjustmentSchema` | Payroll |
| `cashShiftOpenSchema`, `cashShiftCloseSchema` | Shift kas |
| `settingsUpdateSchema` | Pengaturan |
| `reportRangeSchema` | Laporan |

Catatan penting: schema update **tidak** memakai `.partial()` pada schema input yang punya `.default()`. Di Zod, `.partial()` tetap menerapkan default, sehingga PATCH `{ "price": 50000 }` bisa mereset `description`, `sortOrder`, dan `active`. Karena itu setiap entitas punya schema update eksplisit.

---

## 9. Audit log

Tabel `audit_logs` mencatat:

- `outletId`, `userId` (aktor)
- `action`, `entity`, `entityId`
- `before`, `after` (JSONB)
- timestamp

Aksi yang sudah dicatat:

- `user.create`
- `user.update`
- `user.reset_pin`
- `user.activate`
- `user.deactivate`
- `order.create`
- `order.status`
- `order.payment`
- `order.cancel`
- `attendance.save`
- `payroll.save`
- `payroll.finalize`
- `cash_shift.open`
- `cash_shift.close`

Audit mencakup perubahan paket, add-on, outlet, dan bank melalui service terkait.

---

## 10. Seed data

Jalankan:

```bash
npm run db:seed
```

| Data | Jumlah | Keterangan |
|---|---|---|
| Outlet | 1 | `Cuci Steam Bersama`, pajak 0% |
| Paket | 6 | 3 motor + 3 mobil |
| Add-on | 4 | Semprot Wax, Ojek Ban, Semprot Interior, Poles Kaca |
| Bank | 3 | BCA, BRI, Mandiri |
| Admin | 1 | `admin@pos.test` / `admin123` |

- Seed **idempotent**: aman dijalankan berulang, memakai `onConflictDoUpdate`.
- Harga seed masih **placeholder `1000`** sesuai rencana. Ganti lewat Pengaturan setelah frontend selesai.
- PIN admin adalah PIN demo. **Wajib diganti** sebelum produksi.
- Jika admin sudah ada, seed tidak mengubah role/PIN-nya.

---

## 11. Testing

```bash
npm test            # sekali jalan
npm run test:watch  # mode watch
```

Karakteristik:

- Vitest 5 + jsdom.
- Database test memakai **PGlite in-memory**, bukan Postgres eksternal.
- Migrasi dijalankan otomatis dari folder `drizzle/`.
- `maxWorkers: 2`, `hookTimeout: 60_000`, `testTimeout: 30_000` karena PGlite berat di CPU/memori.
- Route test memakai `vi.mock("next/headers")` dan mengambil cookie dari header `set-cookie` Better Auth.
- Test service memakai `createTestDatabase()` dan menutup koneksi di `afterAll`.

Cakupan saat ini:

| Area | File |
|---|---|
| Health | `src/app/api/health/route.test.ts` |
| Paket (service + route) | `src/lib/services/service-packages.test.ts`, `src/app/api/packages/route.test.ts` |
| Add-on | `src/lib/services/addons.test.ts` |
| Outlet | `src/lib/services/outlets.test.ts` |
| Bank | `src/lib/services/banks.test.ts` |
| Settings | `src/lib/services/settings.test.ts` |
| Pengguna (service + route) | `src/lib/services/users.test.ts`, `src/app/api/users/route.test.ts` |
| Order (service) | `src/lib/services/orders.test.ts` |
| Absensi (service) | `src/lib/services/attendance.test.ts` |
| Payroll (service) | `src/lib/services/payroll.test.ts` |
| Shift kas (service) | `src/lib/services/cash-shifts.test.ts` |
| Laporan (service) | `src/lib/services/reports.test.ts` |
| Auth & session | `src/lib/auth/config.test.ts`, `src/lib/auth/session.test.ts` |
| Schema & seed | `src/lib/db/schema.test.ts`, `src/lib/db/seed.test.ts` |
| HTTP & validasi | `src/lib/http.test.ts`, `src/lib/schemas.test.ts` |

---

## 12. Environment & setup

### 12.1 Prasyarat

- Node.js 20+ (LTS)
- npm
- PostgreSQL/Supabase untuk development; test tidak memerlukannya

### 12.2 Langkah setup

```bash
npm install
cp .env.example .env.local
# isi DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, Google OAuth, dll.

npm run db:migrate
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`. Root saat ini redirect ke `/kasir`, yang **belum ada** sampai frontend Task 10 selesai. Gunakan endpoint API langsung untuk sementara.

### 12.3 Environment variable

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi runtime (Supabase transaction pooler) |
| `DIRECT_URL` | Tidak | Koneksi migrasi; fallback ke URL default drizzle-kit |
| `SUPABASE_SERVICE_ROLE_KEY` | Tidak | Disiapkan, belum dipakai backend F1 |
| `BETTER_AUTH_SECRET` | Ya | Minimal 32 karakter |
| `BETTER_AUTH_URL` | Ya | Base URL aplikasi, mis. `http://localhost:3000` |
| `WEB_ORIGIN` | Ya | Origin yang diizinkan untuk CORS/trusted origin |
| `GOOGLE_CLIENT_ID` | Ya | Kredensial Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Ya | Kredensial Google OAuth |
| `NODE_ENV` | Tidak | `development` / `test` / `production` |

Google OAuth redirect URI:

```text
{BETTER_AUTH_URL}/api/auth/callback/google
```

### 12.4 Script npm

| Script | Fungsi |
|---|---|
| `npm run dev` | Next.js development |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest sekali jalan |
| `npm run db:generate` | Generate migrasi Drizzle |
| `npm run db:migrate` | Jalankan migrasi |
| `npm run db:seed` | Seed data awal |

---

## 13. Batasan & utang teknis

Hal-hal berikut **belum** dikerjakan dan perlu diketahui tim:

| # | Item | Rencana |
|---|---|---|
| 1 | Belum ada endpoint `PATCH /api/banks/:id` (soft-delete bank masih via service) | Backlog Pengaturan |
| 2 | Audit mencakup transaksi dan master data | Sudah dilakukan |
| 3 | Cek “admin terakhir” memakai count lalu update, belum dalam transaksi | F7 (race condition) |
| 4 | Endpoint update/reset user berdasarkan `id` belum memeriksa outlet pemilik | F2 bila multi-outlet |
| 5 | `GET /api/outlets` mengembalikan semua outlet ke semua role | F2 bila multi-outlet |
| 6 | Belum ada rate limiting login/PIN | F7 |
| 7 | Belum ada observability/log terstruktur | F7 |
| 8 | Harga seed dan PIN admin masih placeholder | Sebelum produksi |
| 9 | UI dan PWA sudah tersambung API; mode demo dihapus | Sudah dilakukan |
| 10 | Belum ada endpoint khusus settings update (sudah ada `PATCH /api/settings`) | Sudah dilakukan |

---

## 14. Jobdesk Backend Developer

### 14.1 Tanggung jawab utama

1. **Skema & migrasi database**
   - Menjaga `src/lib/db/schema.ts` sebagai sumber tunggal.
   - Menulis migrasi lewat `drizzle-kit generate`, bukan mengubah database manual.
   - Memastikan migrasi aman, reversible bila memungkinkan, dan tidak merusak data produksi.

2. **Auth & otorisasi**
   - Menjaga konfigurasi Better Auth (Google, email/PIN, session).
   - Menegakkan role di Route Handler, bukan di halaman.
   - Menjaga agar user nonaktif tidak bisa memakai sesi lama.
   - Menangani reset PIN dan pencabutan sesi.

3. **Route Handler API**
   - Membuat endpoint di `src/app/api/**` sesuai kontrak PRD.
   - Route tetap tipis: parsing, auth, panggil service, response/error.
   - Menjaga format `{ data }` dan `{ error: { code, message } }`.

4. **Service layer & logika bisnis**
   - Menaruh aturan bisnis di `src/lib/services/**`.
   - Service menerima `db` sebagai argumen dan tidak bergantung pada `next/headers`.
   - Menjaga aturan harga, snapshot, duplikat, soft-delete, dan scoping outlet.

5. **Validasi & kontrak data**
   - Memperbarui `src/lib/schemas.ts` untuk setiap input baru.
   - Memastikan schema update tidak mereset field yang tidak dikirim.
   - Menjaga pesan validasi dalam Bahasa Indonesia.

6. **Audit log**
   - Mencatat aksi sensitif: siapa, kapan, aksi apa, sebelum/sesudah.
   - Memastikan audit tidak membocorkan PIN/password.

7. **Testing**
   - Menulis test service dan route dengan PGlite.
   - Menguji kasus sukses, validasi, duplikat, otorisasi, dan efek samping.
   - Menjaga `npm test`, `npm run lint`, `npm run typecheck`, dan `npm run build` tetap hijau.

8. **Dokumentasi & integrasi**
   - Menjaga dokumen ini dan kontrak API tetap akurat.
   - Berkoordinasi dengan frontend soal bentuk response/error.
   - Membantu QA mereproduksi bug backend.

9. **Keamanan & operasional**
   - Menjaga secret hanya di environment server.
   - Memvalidasi env saat startup.
   - Merencanakan migrasi produksi dan rollback.
   - Menjaga dependency tetap di-pin dan memperbarui dengan sadar.

### 14.2 Yang bukan jobdesk backend

- Membuat halaman, komponen visual, atau layout UI.
- Mengatur state client (TanStack Query/Zustand) dan cache IndexedDB.
- Menulis test E2E UI atau mengatur desain PWA shell.
- Menentukan harga/pajak bisnis; nilai tersebut dibaca dari database/Pengaturan.

### 14.3 Jobdesk per fase

| Fase | Deliverable backend | Status |
|---|---|---|
| **F1 — Fondasi** | Schema + migrasi, auth, API master data, API pengguna, seed, test | Selesai |
| **F2 — Kasir Inti** | API pelanggan/kendaraan, order + invoice + nomor antrean atomik, `price_snapshot`, pembayaran tunai/transfer, buka/tutup kas, pembatalan + audit, token struk digital, idempotensi `client_id` | Selesai |
| **F3 — Papan Status** | Query board hari ini, filter tipe/status, update status dengan aturan transisi, data timer/estimasi, dukungan polling/real-time | Selesai |
| **F4 — Laporan** | Query agregasi harian/mingguan/bulanan, per paket/add-on/metode bayar/karyawan/kasir, export CSV, pembatasan role | Selesai |
| **F5 — Absensi & Gaji** | API absensi, rekap bulanan, payroll run, kalkulasi gaji, finalisasi + audit, data slip PDF | Selesai |
| **F6 — Offline** | Sinkronisasi batch/idempotent, penanganan konflik, versi data, endpoint cache master data | Belum |
| **F7 — Polish** | Audit penuh, rate limiting, observability, hardening keamanan, runbook backup/migrasi | Belum |

### 14.4 Definition of Done backend

Sebuah pekerjaan backend dianggap selesai bila:

- [ ] Perubahan schema punya migrasi dan test.
- [ ] Input divalidasi dengan Zod di `src/lib/schemas.ts`.
- [ ] Logika bisnis ada di service, bukan di route/halaman.
- [ ] Route memakai `initializeServer()`, `requireUser()`, dan `jsonError()`.
- [ ] Aksi sensitif menulis `audit_logs`.
- [ ] Ada test PGlite untuk kasus sukses, validasi, dan otorisasi.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` lulus.
- [ ] Dokumen backend/kontrak API diperbarui bila ada perubahan.
- [ ] PR direview minimal oleh satu anggota tim lain.

### 14.5 Ritme kerja & kolaborasi

- **Harian**: cek PR/issue, perbaiki bug backend, pastikan test tetap hijau.
- **Sebelum mulai fitur**: baca PRD dan rencana fase terkait; konfirmasi kontrak API ke frontend.
- **Saat menambah endpoint**: update dokumen ini + beri contoh request/response.
- **Sebelum merge**: pastikan migrasi bisa dijalankan di database bersih dan tidak hanya di PGlite.
- **Saat rilis**: koordinasi migrasi produksi, seed, dan environment variable dengan pemilik deploy.

---

## 15. Referensi

- [`prd.md`](../../prd.md) — spesifikasi produk.
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — aturan branch, commit, dan kode.
- [`docs/superpowers/plans/2026-10-20-01-fondasi.md`](../superpowers/plans/2026-10-20-01-fondasi.md) — rencana F1.
- [`docs/superpowers/plans/README.md`](../superpowers/plans/README.md) — peta rencana F1–F7.
- Pull Request backend F1: [#1](https://github.com/irgifebry/pos-steam/pull/1).

---

Dokumen ini hidup. Setiap endpoint, aturan bisnis, atau keputusan teknis baru **wajib** memperbarui file ini agar frontend dan QA punya kontrak yang sama.
