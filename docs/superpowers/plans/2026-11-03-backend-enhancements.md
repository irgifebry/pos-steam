# Backend Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menuntaskan gap fitur, memperbaiki bug logika & race condition, serta melengkapi endpoint backend POS Cuci Steam sesuai spesifikasi PRD.

**Architecture:** Next.js 16 App Router Route Handlers tipis yang mendelegasikan logika bisnis ke file-file `src/lib/services/*` berbasis Drizzle ORM, divalidasi dengan Zod, dan diuji end-to-end secara in-memory menggunakan PGlite tanpa dependensi eksternal.

**Tech Stack:** Next.js 16.4.2, TypeScript 5.9.3, Drizzle ORM 0.45.4, PostgreSQL / PGlite 0.5.10, Zod 4.6.7, Vitest 5.0.5.

**Spec:** `prd.md` dan `docs/backend/README.md`.

## Global Constraints

- Semua endpoint API mengikuti format `{ data: T }` atau `{ error: { code: string, message: string } }`.
- Route Handler dilarang berisi query/logika bisnis mentah; wajib melalui layer service.
- Error bisnis menggunakan `HttpError(status, code, message)`.
- Semua modifikasi data sensitif mencatat record di tabel `audit_logs`.
- Tidak menambah dependensi baru di `package.json`.
- Seluruh test Vitest wajib lulus (`npm test`) dan `npm run lint` + `npm run typecheck` wajib bersih.

## Review Focus

1. Order items modification saat order sudah berpindah ke `proses` atau `selesai` harus gagal dengan 409 INVALID_STATUS.
2. Order items modification menghitung ulang subtotal, pajak outlet, dan grand total secara akurat dan atomik dalam database transaction.
3. Dashboard omzet harian mencerminkan data transaksi yang statusnya lunas (`paid`) pada tanggal hari ini (WIB / `jakartaDate`).
4. Ekspor CSV dan query aggregasi omzet menangani rentang tanggal di mana belum ada transaksi sama sekali tanpa melempar error / division by zero.
5. Soft-delete dan edit bank via `PATCH /api/banks/:id` memastikan scoping `outletId` terjaga.

---

### Task 1: Endpoint `PATCH /api/banks/[id]`

**Files:**
- Create: `src/app/api/banks/[id]/route.ts`
- Test: `src/app/api/banks/[id]/route.test.ts`

**Interfaces:**
- Consumes: `updateBank(db, id, input, outletId)` from `src/lib/services/banks.ts`
- Produces: `PATCH /api/banks/:id` HTTP Route Handler

- [ ] **Step 1: Write the failing route test**

Test mencakup:
- 401 jika unauthenticated
- 400 jika input tidak lolos Zod `bankUpdateSchema`
- 404 jika bank tidak ditemukan / bukan milik outlet user
- 200 dan mengembalikan `{ data: Bank }` yang terupdate

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/banks/[id]/route.test.ts`
Expected: FAIL (route tidak ditemukan / 404)

- [ ] **Step 3: Implement `PATCH` handler in `src/app/api/banks/[id]/route.ts`**

Panggil `initializeServer()`, `requireUser()`, parse params `id`, parse body dengan `bankUpdateSchema`, panggil `updateBank(db, id, body, user.outletId)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/banks/[id]/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/banks/[id]/route.ts src/app/api/banks/[id]/route.test.ts
git commit -m "feat(api): add PATCH /api/banks/[id] endpoint"
```

---

### Task 2: Service & Endpoint `PATCH /api/orders/[id]` (Update Item Order Saat Status Menunggu)

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/services/orders.ts`
- Modify: `src/lib/services/orders.test.ts`
- Create: `src/app/api/orders/[id]/route.ts`
- Create: `src/app/api/orders/[id]/route.test.ts`

**Interfaces:**
- Consumes: `orderUpdateSchema` (packageId opsional, addons opsional, vehicleType opsional, plate, nama)
- Produces: `updateOrderItems(db, orderId, outletId, actor, input): Promise<OrderView>`

- [ ] **Step 1: Tambah schema validasi `orderUpdateSchema` di `src/lib/schemas.ts`**

Input: `packageId` (opsional), `addons` (array `orderAddonSchema`, opsional), `customerName`, `customerPhone`, `plate`.
Hanya dapat dilakukan jika `status === "menunggu"`.

- [ ] **Step 2: Write failing unit test di `src/lib/services/orders.test.ts`**

Test:
- Mengubah paket dan addon pada order berstatus `menunggu` -> total & tax terhitung ulang, `order_items` terupdate.
- Gagal 409 jika status sudah `proses`, `selesai`, `paid`, atau `dibatalkan`.

- [ ] **Step 3: Implementasi `updateOrderItems` di `src/lib/services/orders.ts`**

Logika atomik dalam transaction:
- Cek status order == "menunggu".
- Hapus item lama, pasang snapshot item baru.
- Hitung ulang subtotal, tax, grandTotal.
- Simpan audit log `order.update_items`.

- [ ] **Step 4: Implementasi Route Handler `PATCH /api/orders/[id]/route.ts` & test route**

Buat endpoint dan test route-nya.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/orders.test.ts src/app/api/orders/[id]/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/types.ts src/lib/services/orders.ts src/lib/services/orders.test.ts src/app/api/orders/[id]/
git commit -m "feat(orders): allow updating items while order status is menunggu"
```

---

### Task 3: Service & Endpoint `GET /api/dashboard/today`

**Files:**
- Modify: `src/lib/services/reports.ts`
- Modify: `src/lib/services/reports.test.ts`
- Create: `src/app/api/dashboard/today/route.ts`
- Create: `src/app/api/dashboard/today/route.test.ts`

**Interfaces:**
- Produces: `getTodayDashboard(db, outletId): Promise<TodayDashboardView>`
  - `totalRevenue`: total omzet lunas hari ini
  - `totalTransactions`: jumlah order lunas hari ini
  - `averageTicket`: rata-rata per transaksi
  - `cashRevenue`: omzet tunai
  - `transferRevenue`: omzet transfer
  - `motorCount`: jumlah cucian motor
  - `mobilCount`: jumlah cucian mobil

- [ ] **Step 1: Write failing test di `src/lib/services/reports.test.ts`**

Uji perhitungan ringkasan hari ini dengan mock order lunas tunai/transfer motor & mobil.

- [ ] **Step 2: Implement `getTodayDashboard` di `src/lib/services/reports.ts`**

Gunakan `jakartaDate()`, panggil `listOrders({ outletId, from: today, to: today, includePaid: true })`, agregasikan metric.

- [ ] **Step 3: Buat route `src/app/api/dashboard/today/route.ts` dan test route**

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run src/app/api/dashboard/today/route.test.ts src/lib/services/reports.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/reports.ts src/lib/services/reports.test.ts src/app/api/dashboard/today/
git commit -m "feat(dashboard): add today summary endpoint"
```

---

### Task 4: Perbaikan Laporan Kas & Tambah `GET /api/reports/omzet`

**Files:**
- Modify: `src/app/api/reports/cash/route.ts`
- Modify: `src/app/api/reports/cash/route.test.ts` (jika ada, atau buat baru)
- Create: `src/app/api/reports/omzet/route.ts`
- Create: `src/app/api/reports/omzet/route.test.ts`

**Interfaces:**
- `GET /api/reports/cash`: sinkronkan kas shift aktif vs transaksi tunai yang terjadi selama shift berlangsung.
- `GET /api/reports/omzet?from=...&to=...&groupBy=day|week|month`: ringkasan omzet berkala untuk grafik tren di menu Laporan.

- [ ] **Step 1: Perbaiki logika hitung `reports/cash/route.ts`**

Pastikan `totalTunai` dan selisih dihitung berdasarkan pembayaran tunai dalam rentang shift aktif (atau tanggal terpilih), konsisten dengan `closeCashShift`.

- [ ] **Step 2: Buat route `GET /api/reports/omzet/route.ts`**

Grouping berdasarkan `day`, `week`, atau `month` dari hasil transaksi lunas dalam rentang tanggal.

- [ ] **Step 3: Tulis test Vitest untuk kedua endpoint**

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run src/app/api/reports/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/reports/
git commit -m "fix(reports): align cash shift reconciliation and add omzet trends endpoint"
```

---

### Task 5: Endpoint `GET /api/audit-logs`

**Files:**
- Create: `src/lib/services/audit.ts`
- Create: `src/lib/services/audit.test.ts`
- Create: `src/app/api/audit-logs/route.ts`
- Create: `src/app/api/audit-logs/route.test.ts`

**Interfaces:**
- Produces: `listAuditLogs(db, outletId, { limit, offset, entity })`
- Endpoint: `GET /api/audit-logs?entity=...&limit=50&offset=0`

- [ ] **Step 1: Write failing test di `src/lib/services/audit.test.ts`**

- [ ] **Step 2: Implementasi `listAuditLogs` di `src/lib/services/audit.ts`**

Join dengan tabel `user` untuk mendapatkan nama aktor, urutkan descending berdasarkan `createdAt`.

- [ ] **Step 3: Buat route `src/app/api/audit-logs/route.ts`**

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run src/lib/services/audit.test.ts src/app/api/audit-logs/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/audit.ts src/lib/services/audit.test.ts src/app/api/audit-logs/
git commit -m "feat(audit): add audit logs list service and API route"
```

---

### Task 6: Offline Sync Foundation (`GET /api/sync/bootstrap` & `POST /api/sync/batch`)

**Files:**
- Create: `src/lib/services/sync.ts`
- Create: `src/lib/services/sync.test.ts`
- Create: `src/app/api/sync/bootstrap/route.ts`
- Create: `src/app/api/sync/batch/route.ts`
- Create: `src/app/api/sync/route.test.ts`

**Interfaces:**
- `getSyncBootstrap(db, outletId)`: paket aktif, add-on aktif, bank aktif, daftar karyawan ringan, outlet info, counter sequence invoice & antrean hari ini.
- `processSyncBatch(db, outletId, actor, batch)`: array operasi `order.create`, `order.status`, `order.payment` dengan deduplikasi berbasis `clientId` secara idempotent.

- [ ] **Step 1: Write test untuk `getSyncBootstrap` dan `processSyncBatch`**

- [ ] **Step 2: Implementasi service `src/lib/services/sync.ts`**

- [ ] **Step 3: Buat endpoint `GET /api/sync/bootstrap` dan `POST /api/sync/batch`**

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run src/lib/services/sync.test.ts src/app/api/sync/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/sync.ts src/lib/services/sync.test.ts src/app/api/sync/
git commit -m "feat(sync): add offline bootstrap and idempotent batch sync endpoints"
```

---

### Task 7: Verifikasi Menyeluruh & Update Dokumentasi

**Files:**
- Modify: `docs/backend/README.md`

- [ ] **Step 1: Jalankan seluruh test suite**

Run: `npm test`
Expected: Semua test (25+ file) lulus 100%.

- [ ] **Step 2: Jalankan lint dan typecheck**

Run: `npm run lint` & `npm run typecheck`
Expected: Bersih tanpa warning/error.

- [ ] **Step 3: Perbarui `docs/backend/README.md` dengan endpoint-endpoint baru**

- [ ] **Step 4: Commit dan Push**

```bash
git add docs/backend/README.md
git commit -m "docs(backend): update API contracts with new endpoints and sync specs"
git push origin main
```
