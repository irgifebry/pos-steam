## Ringkasan

<!-- Jelaskan apa yang diubah dan mengapa. Satu paragraf singkat. -->

## Jenis Perubahan

- [ ] `feat` — fitur baru
- [ ] `fix` — perbaikan bug
- [ ] `test` — menambah/memperbaiki test
- [ ] `docs` — dokumentasi
- [ ] `refactor` — ubah struktur tanpa mengubah perilaku
- [ ] `perf` — performa
- [ ] `chore` / `build` — tooling, dependency, build

## Terkait

<!-- Closes #123, atau link issue/PR terkait. -->

Closes #

## Cara Verifikasi

<!-- Langkah yang bisa diikuti reviewer/QA untuk membuktikan perubahan ini bekerja. -->

1.
2.
3.

## Bukti

<!-- Screenshot, video, output test, log, atau request/response. Hapus data sensitif. -->

## Checklist Developer

- [ ] `npm run typecheck` exit 0
- [ ] `npm run lint` tanpa error
- [ ] `npm test` semua PASS, tidak ada test skip
- [ ] `npm run build` sukses
- [ ] Test baru ditambahkan untuk perilaku yang berubah (bila relevan)
- [ ] Tidak ada nilai bisnis hardcoded (harga, pajak, gaji)
- [ ] Tidak ada secret/kredensial di kode, commit, atau client bundle
- [ ] Otorisasi dicek di Route Handler, bukan hanya di UI
- [ ] Validasi memakai Zod di `src/lib/schemas.ts`
- [ ] Perubahan skema lewat `drizzle-kit generate`, bukan edit SQL manual
- [ ] Dependency baru dipin (tanpa `^`/`~`)
- [ ] Audit log ditambahkan untuk aksi sensitif (bila relevan)
- [ ] UI/error memakai Bahasa Indonesia; Rupiah tanpa desimal; tanggal `dd/MM/yyyy`
- [ ] Dokumentasi (PRD/README/rencana) diperbarui bila perilaku berubah

## Checklist QA

<!-- Diisi QA saat review. Kosongkan jika belum diuji. -->

- [ ] Test case terkait: `F1-___`
- [ ] Smoke test PR lolos (`docs/qa/regression-checklist.md` §1)
- [ ] Regression area terkait lolos
- [ ] Perilaku sesuai acceptance criteria PRD
- [ ] Diuji di Android Chrome (dan iOS Safari bila UI)
- [ ] Tidak ada bug S1/S2 terbuka
- [ ] Bukti uji dilampirkan
- [ ] QA sign-off

## Catatan untuk Reviewer

<!-- Risiko, keputusan desain, hal yang perlu perhatian khusus, atau rollback plan. -->
