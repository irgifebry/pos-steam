# QA — POS Cuci Steam

Dokumen pengujian untuk proyek POS Cuci Steam. QA bertanggung jawab memastikan acceptance criteria di [`prd.md`](../../prd.md) benar-benar terbukti sebelum fitur dirilis, baik pada **klien web (Next.js)** maupun **klien mobile (Expo/React Native di [`mobile/`](../../mobile))**.

## Daftar Dokumen

| Dokumen | Isi |
|---|---|
| [`test-plan.md`](./test-plan.md) | Strategi, ruang lingkup, environment, data uji, prioritas, alur bug, roadmap QA, dan pertanyaan terbuka |
| [`test-cases/f1-fondasi.md`](./test-cases/f1-fondasi.md) | 69 test case F1 (build, schema, auth/RBAC, master data, UI/PWA, seed/deploy) |
| [`regression-checklist.md`](./regression-checklist.md) | Smoke test PR, regression F1, invariant lintas fase, regresi mobile (Expo), release checklist |

Template:

- Bug report: [`.github/ISSUE_TEMPLATE/bug_report.yml`](../../.github/ISSUE_TEMPLATE/bug_report.yml)
- Pull request: [`.github/pull_request_template.md`](../../.github/pull_request_template.md)

## Klien yang Diuji

Proyek ini memiliki dua klien yang keduanya masuk ruang lingkup QA dan memakai backend serta kontrak API yang sama (sukses `{ data: ... }`, error `{ error: { code, message } }`):

| Klien | Lokasi | Dokumentasi & check terkait |
|---|---|---|
| **Web (Next.js)** | Root repo (`src/`) | Test case F1–F7, smoke test PR, dan regression web/backend di [`regression-checklist.md`](./regression-checklist.md) §1–§4 |
| **Mobile (Expo/React Native, SDK ~58, React Navigation v7)** | [`mobile/`](../../mobile) | Check khusus di [`regression-checklist.md`](./regression-checklist.md) §5 "Regresi Mobile (Expo)"; ruang lingkup, environment, dan prioritas di [`test-plan.md`](./test-plan.md) §2, §4, dan §6.3 |

Perbedaan yang perlu diingat saat menguji:

- Mobile memakai **tema terang saja** (dark mode dihapus) dan hanya punya **4 tab**: Kasir, Antrean, Laporan, Pengaturan. Pengelolaan pengguna admin ada di Pengaturan → Pengguna.
- Pengaturan mobile dipecah menjadi sub-halaman **Paket Layanan, Add-on, Rekening Bank, Pengguna**. Di mobile, data dihapus lewat **Hapus** (DELETE), bukan "Nonaktifkan"; daftar hanya memuat record aktif.
- Role yang berlaku: **hanya `admin`**. Istilah lama pada test case historis dibaca sebagai `admin`.

## Status

- **F1 — Fondasi:** test case sudah tersedia; implementasi berjalan dan sebagian sudah terverifikasi (lihat verifikasi terkini di bawah).
- **F2–F7:** test case ditulis setelah fase sebelumnya selesai dan terverifikasi (sesuai aturan di [`docs/superpowers/plans/README.md`](../superpowers/plans/README.md)).
- **Verifikasi terkini (lokal):** `npm test` root lulus (28 file / 116 test); `npx tsc --noEmit` root dan mobile bersih; `npx expo-doctor` 20/20. Preview: Expo Web `http://localhost:8081` dengan backend `http://localhost:3001` (Expo Web memerlukan CORS proxy `src/proxy.ts`).

## Alur Cepat QA

1. Baca [`test-plan.md`](./test-plan.md), terutama §6 (prioritas), §7 (exit criteria), dan §8 (alur bug).
2. Untuk setiap PR, jalankan **Smoke Test** di [`regression-checklist.md`](./regression-checklist.md), ditambah **Regresi Mobile (Expo)** (§5) jika PR menyentuh `mobile/` atau kontrak API yang dipakai mobile.
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
