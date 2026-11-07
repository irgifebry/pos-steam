# Frontend Audit Fixes — Implementation Plan

**Goal:** Memperbaiki seluruh temuan audit frontend (124 findings) pada proyek POS Cuci Steam: critical/high/medium/low, a11y, timezone, race conditions, konsistensi filter, format helpers, PWA.

**Spec:** Audit report (sub-agent findings, 6 area). PRD `prd.md` (§7, §9, §10, §11).

**Tech Stack:** Next.js 16.4.2 · React 19 · TypeScript 5.9 · Tailwind 4 · Vitest 5 + PGlite.

## Global Constraints
- Bahasa UI & pesan error: Bahasa Indonesia. Nama variabel/kode: English.
- Format angka: Rupiah tanpa desimal (`Rp 65.000`), tanggal `dd/MM/yyyy`.
- Harga integer Rupiah (bukan float).
- Tidak ada hardcoding nilai bisnis.
- Akses DB hanya via server (Route Handler). Service layer menerima `db`.
- Semua tabel snake_case di Postgres; Drizzle camelCase.
- Endpoint yang mengubah data sensitif wajib audit_logs.
- Test API tidak boleh butuh DB eksternal (PGlite).
- Versi dependency dipin.
- Target: Android 8+, iOS Safari 16+.

## Tasks

### Task 1 — Critical: Antrean payment form reset saat polling
**Files:** `src/app/(app)/antrean/page.tsx`
- Ubah reset form agar hanya terjadi saat `payOrder.id` berubah (track previous id dengan ref).
- Sinkronkan data order terbaru tanpa reset form.

### Task 2 — High: Kasir double-submit race
**Files:** `src/app/(app)/kasir/page.tsx`
- Tambah `submittingRef` diperiksa/diset sinkron sebelum validasi; clear di finally.

### Task 3 — High: Antrean double-action race
**Files:** `src/app/(app)/antrean/page.tsx`
- Tambah ref locks: `busyIdsRef`, `payInFlightRef`, `cancelInFlightRef` diperiksa sinkron.

### Task 4 — High: Field label association (a11y)
**Files:** `src/components/ui/Field.tsx`
- Enhance juga custom `Input` (by displayName) agar label/input terasosiasi; inject id konsisten; aria-required; keys pada map.

### Task 5 — High: Laporan default tanggal Jakarta
**Files:** `src/app/(app)/laporan/page.tsx`
- `todayISO()` pakai `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`.

### Task 6 — High: Pengaturan outlet-scoping paket/add-on
**Files:** `src/app/api/packages/[id]/route.ts`, `src/app/api/addons/[id]/route.ts`, `src/lib/services/service-packages.ts`, `src/lib/services/addons.ts`
- Route pass `user.outletId`; update final `WHERE id AND outletId`.

### Task 7 — High: Global error boundary styles
**Files:** `src/app/global-error.tsx`
- Import `./globals.css` atau inline styles.

### Task 8 — Medium: Filter laporan konsisten antar tab/export
**Files:** `src/app/(app)/laporan/page.tsx`, report routes
- Propagate `vehicleType`/`paymentMethod` query params ke endpoints & CSV; atau scope filter ke tab Omzet.

### Task 9 — Medium: Kas export di range mode
**Files:** `src/app/(app)/laporan/page.tsx`
- Disable kas export di range mode.

### Task 10 — Medium: Retry kas single-date path
**Files:** `src/app/(app)/laporan/page.tsx`
- Route kas retry lewat single-date path.

### Task 11 — Medium: Antrean QueueCard timer lift
**Files:** `src/app/(app)/antrean/page.tsx`
- Satu timer di parent, pass `now`.

### Task 12 — Medium: Antrean payOrder sync tanpa reset form
**Files:** `src/app/(app)/antrean/page.tsx`
- (covered in Task 1)

### Task 13 — Medium: Karyawan loaders AbortController + reprint trigger
**Files:** `src/app/(app)/karyawan/page.tsx`
- Add AbortController/unmount safety; separate print trigger.

### Task 14 — Medium: Pengaturan load-error vs empty
**Files:** `src/app/(app)/pengaturan/{paket,add-on,outlet,pengguna,gaji-kas}/page.tsx`
- Tambah `loadError` state seperti bank.

### Task 15 — Medium: Pengaturan form validation association + toast variant
**Files:** pengaturan pages
- Associate `formError` ke input via `error` prop; toast variant "error".

### Task 16 — Medium: Pengaturan destructive toggle in-flight guard
**Files:** pengaturan pages
- Track saving state pada toggle.

### Task 17 — Medium: Api-client retry/timeout
**Files:** `src/lib/api-client.ts`
- Tambah timeout AbortController + retry GET.

### Task 18 — Medium: PWA precache /offline + swSelf warning
**Files:** `src/app/sw.ts`, `next.config.ts`
- Precache `/offline`; hapus unused `swSelf`.

### Task 19 — Medium: Error boundaries logging
**Files:** `src/app/error.tsx`, `src/app/(app)/error.tsx`, `src/app/global-error.tsx`, `src/app/login/error.tsx`
- Tambah `console.error`/reporting.

### Task 20 — Medium: format helpers standardize
**Files:** `src/lib/format.ts`
- `formatWaktu` separator colon + Jakarta; `rupiah` guard Infinity; `formatAngka` guard NaN/Infinity/null; `formatTanggal` consistent invalid handling.

### Task 21 — Low: Struk publik guard order + cancelled + format
**Files:** `src/app/r/[token]/page.tsx`
- Guard `!data?.order`; tampilkan status cancelled; format businessDate; key pakai addon.id; tender/change 0 handling; share error feedback.

### Task 22 — Low: SessionProvider default role
**Files:** `src/components/SessionProvider.tsx`
- Validate user payload; neutral default.

### Task 23 — Low: OperatorSwitcher a11y
**Files:** `src/components/OperatorSwitcher.tsx`
- PIN input aria-label + inputMode; aria-pressed pada operator; loading state.

### Task 24 — Low: Toast/Button a11y & tap targets
**Files:** `src/components/ui/Toast.tsx`, `src/components/ui/Button.tsx`
- Error role alert; dismiss tap target 48px; icon-only detection fix.

### Task 25 — Low: BottomNav dead code + skip-to-content
**Files:** `src/components/BottomNav.tsx`, `src/app/layout.tsx`
- Hapus `visibleTabs`; tambah skip link + main landmark.

### Task 26 — Test: reports timezone fix + format unit tests
**Files:** `src/lib/services/reports.test.ts`, `src/lib/format.test.ts` (new)
- Test pakai `jakartaDate()`; unit tests format helpers.

## Review Focus
1. Race conditions tidak boleh reintroduce (double submit).
2. Timezone konsisten Jakarta di semua date default.
3. A11y: label association, aria-pressed, error association.
4. Outlet scoping pada mutasi master data.
5. Format helpers deterministic (timezone-independent).
6. Tidak ada regresi test (96 → target 98+).
