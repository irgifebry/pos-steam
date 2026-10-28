# QA — POS Cuci Steam

Dokumen pengujian untuk proyek POS Cuci Steam. QA bertanggung jawab memastikan acceptance criteria di [`prd.md`](../../prd.md) benar-benar terbukti sebelum fitur dirilis.

## Daftar Dokumen

| Dokumen | Isi |
|---|---|
| [`test-plan.md`](./test-plan.md) | Strategi, ruang lingkup, environment, data uji, prioritas, alur bug, roadmap QA, dan pertanyaan terbuka |
| [`test-cases/f1-fondasi.md`](./test-cases/f1-fondasi.md) | 69 test case F1 (build, schema, auth/RBAC, master data, UI/PWA, seed/deploy) |
| [`regression-checklist.md`](./regression-checklist.md) | Smoke test PR, regression F1, invariant lintas fase, release checklist |

Template:

- Bug report: [`.github/ISSUE_TEMPLATE/bug_report.yml`](../../.github/ISSUE_TEMPLATE/bug_report.yml)
- Pull request: [`.github/pull_request_template.md`](../../.github/pull_request_template.md)

## Status

- **F1 — Fondasi:** implementasi belum dimulai; test case sudah siap dieksekusi.
- **F2–F7:** test case ditulis setelah fase sebelumnya selesai dan terverifikasi (sesuai aturan di [`docs/superpowers/plans/README.md`](../superpowers/plans/README.md)).

## Alur Cepat QA

1. Baca [`test-plan.md`](./test-plan.md), terutama §6 (prioritas), §7 (exit criteria), dan §8 (alur bug).
2. Untuk setiap PR, jalankan **Smoke Test** di [`regression-checklist.md`](./regression-checklist.md).
3. Eksekusi test case F1 di [`test-cases/f1-fondasi.md`](./test-cases/f1-fondasi.md) dan perbarui kolom Status.
4. Jika gagal, buat issue dengan template bug report. Sertakan ID test case, environment, langkah, expected vs actual, dan bukti.
5. Setelah developer memperbaiki, retest di Preview. Tutup issue hanya jika terbukti lulus.
6. Tulis sign-off di PR/issue rilis.

## Konvensi ID Test Case

| Prefix | Fase |
|---|---|
| `F1-xxx` | Fondasi |
| `F2-xxx` | Kasir Inti |
| `F3-xxx` | Papan Status |
| `F4-xxx` | Laporan |
| `F5-xxx` | Absensi & Gaji |
| `F6-xxx` | Offline |
| `F7-xxx` | Polish |

Nomor tidak harus berurutan rapat; gunakan kelompok per modul (mis. `F1-030` untuk auth).

## Aturan Singkat

- Jangan commit langsung ke `main`.
- Branch QA: `test/...` atau `docs/qa/...`.
- Commit: `test(scope): ...` atau `docs(qa): ...`.
- Jangan memakai data production untuk pengujian destruktif.
- Jangan menutup bug tanpa bukti retest.
- Kerentanan keamanan dilaporkan privat ke maintainer, bukan issue publik.

## Kontak

- QA: Dimas (`@dimas22231`)
- Frontend: `@irgifebry`
- Backend: `@Najwan48`
