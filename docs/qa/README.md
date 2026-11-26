# QA — POS Cuci Steam

Dokumen pengujian untuk proyek POS Cuci Steam. QA bertanggung jawab memastikan acceptance criteria di [`prd.md`](../../prd.md) benar-benar terbukti sebelum fitur dirilis, baik pada **backend API** maupun **klien Expo/React Native di [`mobile/`](../../mobile)**. Tidak ada klien web Next.js — frontend web sudah dihapus.

## Daftar Dokumen

| Dokumen | Isi |
|---|---|
| [`test-plan.md`](./test-plan.md) | Strategi, ruang lingkup, environment, data uji, prioritas, alur bug, roadmap QA, dan pertanyaan terbuka |
| [`test-cases/f1-fondasi.md`](./test-cases/f1-fondasi.md) | Test case F1 historis (sebagian butir UI web tidak lagi relevan; baca sebagai kontrak API) |
| [`test-cases/f2-kasir-inti.md`](./test-cases/f2-kasir-inti.md) | Test case F2 — Kasir Inti: order, antrean, ROYALTY/OJOL, pembayaran, struk, laporan, mobile E2E |
| [`regression-checklist.md`](./regression-checklist.md) | Smoke test PR, regresi backend API, invariant lintas fase, regresi mobile (Expo), release checklist |
| [`test-run-template.md`](./test-run-template.md) | Template laporan eksekusi per run (scope, hasil, defect, sign-off) |
| [`test-runs/2026-11-26-p0-api.md`](./test-runs/2026-11-26-p0-api.md) | Hasil run P0 API 26/11/2026: 25/25 PASS |

Versi Microsoft Word (`.docx`) untuk dokumen yang bisa diisi/dibagikan:

| Dokumen Word | Sumber Markdown |
|---|---|
| [`F2-Kasir-Inti.docx`](./word/F2-Kasir-Inti.docx) | [`test-cases/f2-kasir-inti.md`](./test-cases/f2-kasir-inti.md) |
| [`Laporan-P0-API-2026-11-26.docx`](./word/Laporan-P0-API-2026-11-26.docx) | [`test-runs/2026-11-26-p0-api.md`](./test-runs/2026-11-26-p0-api.md) |
| [`Template-Test-Run-QA.docx`](./word/Template-Test-Run-QA.docx) | [`test-run-template.md`](./test-run-template.md) |

Template:

- Bug report: [`.github/ISSUE_TEMPLATE/bug_report.yml`](../../.github/ISSUE_TEMPLATE/bug_report.yml)
- Pull request: [`.github/pull_request_template.md`](../../.github/pull_request_template.md)

## Yang Diuji

| Area | Lokasi | Dokumentasi & check terkait |
|---|---|---|
| **Backend API (Next.js Route Handlers)** | `src/app/api/**`, `src/lib/**` di root repo | Kontrak di [`docs/backend/README.md`](../backend/README.md); smoke test PR dan regresi API di [`regression-checklist.md`](./regression-checklist.md) §1–§4 |
| **Mobile (Expo/React Native, SDK ~58, React Navigation v7)** | [`mobile/`](../../mobile) | Check khusus di [`regression-checklist.md`](./regression-checklist.md) §5; ruang lingkup, environment, dan prioritas di [`test-plan.md`](./test-plan.md) §2, §4, dan §6.3 |

Kedua area memakai kontrak API yang sama: sukses `{ data: ... }`, error `{ error: { code, message } }`. Root `/` mengembalikan JSON status; health check di `GET /api/health`.

Perbedaan yang perlu diingat saat menguji:

- Backend berjalan di **`http://localhost:3001`** (port `3000` dipakai proyek lain). Untuk produksi, Expo memakai `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app`.
- Mobile memakai **tema terang saja** (dark mode dihapus) dan hanya punya **4 tab**: Kasir, Antrean, Laporan, Pengaturan. Pengelolaan pengguna admin ada di Pengaturan → Pengguna.
- Pengaturan mobile dipecah menjadi 6 sub-halaman: **Paket Layanan, ROYALTY, OJOL, Add-on, Rekening Bank, Pengguna**. Di mobile, data dihapus lewat **Hapus** (DELETE), bukan "Nonaktifkan"; daftar hanya memuat record aktif.
- Role yang berlaku: **hanya `admin`**. Istilah lama pada test case historis dibaca sebagai `admin`.

## Status

- **F1 — Fondasi:** test case historis tersedia; sebagian butir UI web/role lama perlu dibaca sebagai kontrak API atau diperbarui.
- **F2 — Kasir Inti:** test case tersedia; **P0 API sudah dieksekusi 25/25 PASS** pada 26/11/2026. Modul mobile F2 dan sisa kasus negatif belum dieksekusi.
- **F3–F7:** belum ada file test case; tulis setelah F2 stabil (sesuai aturan di [`docs/superpowers/plans/README.md`](../superpowers/plans/README.md)).
- **Verifikasi terkini (lokal):** `npm test` root lulus (**27 file / 120 test**); `npx tsc --noEmit` root dan mobile bersih; `npx expo-doctor` **20/20**; P0 API E2E **25/25 PASS** ([laporan](./test-runs/2026-11-26-p0-api.md)). Backend `http://localhost:3001`; Expo Web `http://localhost:8081` memerlukan CORS `src/proxy.ts`, yang kini juga mengizinkan origin dari `WEB_ORIGIN`/`BETTER_AUTH_URL` untuk produksi.

## Alur Cepat QA

1. Baca [`test-plan.md`](./test-plan.md), terutama §6 (prioritas), §7 (exit criteria), dan §8 (alur bug).
2. Sebelum push, jalankan **Smoke Test** di [`regression-checklist.md`](./regression-checklist.md) §1, ditambah **Regresi Mobile (Expo)** (§5) jika perubahan menyentuh `mobile/` atau kontrak API.
3. Eksekusi test case F2 yang relevan, lalu perbarui kolom Status dan tulis laporan memakai [`test-run-template.md`](./test-run-template.md). Contoh hasil terbaru ada di [`test-runs/2026-11-26-p0-api.md`](./test-runs/2026-11-26-p0-api.md).
4. Jika gagal, buat issue dengan template bug report. Sertakan ID test case, environment, langkah, expected vs actual, dan bukti.
5. Setelah developer memperbaiki, retest di Preview. Tutup issue hanya jika terbukti lulus.
6. Tulis sign-off di laporan run dan issue rilis.

## Konvensi ID Test Case

| Prefix | Fase |
|---|---|
| `F1-xxx` | Fondasi |
| `F2-xxx` | Kasir Inti |
| `F3-xxx` | Papan Status |
| `F4-xxx` | Laporan |
| `F6-xxx` | Offline |
| `F7-xxx` | Polish |

Nomor tidak harus berurutan rapat; gunakan kelompok per modul (mis. `F1-030` untuk auth).

## Aturan Singkat

- Bekerja dan commit langsung di `main`; jangan membuat branch QA (lihat `AGENTS.md` root).
- Commit: `test(scope): ...` atau `docs(qa): ...`, lalu push ke `origin main`.
- Jangan memakai data production untuk pengujian destruktif.
- Jangan menutup bug tanpa bukti retest.
- Kerentanan keamanan dilaporkan privat ke maintainer, bukan issue publik.

## Kontak

- QA: Dimas (`@dimas22231`)
- Mobile: `@irgifebry`
- Backend: `@Najwan48`
