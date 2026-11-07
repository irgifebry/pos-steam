# Task 6 Report — Pengaturan outlet-scoping paket/add-on

Status: complete

Changes:
- `src/app/api/packages/[id]/route.ts`: PATCH/DELETE now call `requireUser()` and pass `user.outletId ?? undefined` to `updateServicePackage`/`deactivateServicePackage`.
- `src/app/api/addons/[id]/route.ts`: same for addons.
- `src/lib/services/service-packages.ts`: final UPDATE now uses `WHERE id AND outletId` when outletId provided (was only by id); added null-row guard; backward-compatible signature type widened.
- `src/lib/services/addons.ts`: widened backward-compatible signature type (scoping already present).

Verification:
- typecheck: pass
- lint: pass (pre-existing sw.ts warning only)
- tests: 96/96 pass

Concerns: none.
