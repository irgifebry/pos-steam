# Backend-only Next.js untuk POS Cuci Steam

Tanggal: 2026-11-23

## Intent

Aplikasi POS sepenuhnya berpindah ke Expo/React Native. Repo Next.js tidak lagi
melayani UI web; ia hanya menjadi backend API yang bisa di-deploy ke Vercel dengan
database Supabase. Expo app memakai URL backend hasil deploy sebagai base URL.

## Goals

- Menghapus seluruh frontend web (halaman, komponen, hook, aset PWA, Tailwind, CSS).
- Mempertahankan seluruh API, autentikasi, database, migrasi, dan logika bisnis.
- Menyediakan cara mengarahkan Expo app ke backend production lewat environment variable.
- Menjaga build, typecheck, dan test tetap lulus.
- Menyelaraskan dokumentasi dengan keadaan baru.

## Non-goals

- Mengubah perilaku bisnis (ROYALTY, pembayaran saat Mulai Cuci, kas, dll.).
- Menghapus data atau akun demo.
- Membuat UI web pengganti.
- Mengubah schema database.

## Constraints

- Next.js 16.4.2 App Router; route handler (`route.ts`) tidak membutuhkan root layout.
- `react` dan `react-dom` tetap dibutuhkan sebagai peer dependency Next.js.
- Better Auth memakai `trustedOrigins`; CORS untuk Expo Web ditangani `src/proxy.ts`.
- Port lokal backend 3001 (port 3000 dipakai proyek lain di mesin ini).

## Approaches

1. **Hapus UI, simpan API (dipilih).** Repo tetap satu Next.js app berisi route handler
   dan library backend. Paling sedikit pergerakan, deploy Vercel langsung jalan,
   migrasi dan seed tetap memakai script yang ada.
2. Pisahkan backend ke repo/package baru. Lebih bersih secara teori, tapi membutuhkan
   pemindahan seluruh `src/lib`, konfigurasi, dan pipeline — risiko tinggi tanpa Manfaat
   operasional tambahan untuk deploy Vercel.
3. Biarkan file UI ada tapi tidak dipakai. Tidak mencapai tujuan dan menyisakan
   dependency frontend yang memperbesar build.

## Design

- Hapus: `src/app/page.tsx`, `src/app/(app)/**`, `src/app/login/**`, `src/app/r/**`,
  `src/app/offline/**`, `error/loading/not-found/global-error`, `src/app/globals.css`,
  `src/app/sw.ts`, `src/components/**`, `src/hooks/**`, `public/**`,
  `postcss.config.mjs`, dan helper frontend `src/lib/{api-client,auth/client,cn,format}.ts`.
- Pertahankan: `src/app/api/**`, seluruh `src/lib` lainnya, `src/proxy.ts`, `drizzle/**`,
  konfigurasi TypeScript/ESLint/Drizzle/Vitest, dan dependency backend.
- Tambah `src/app/route.ts` berisi status JSON (root tidak 404 di Vercel).
- `next.config.ts`: hapus wrapper Serwist dan konfigurasi service worker; security header dipertahankan.
- `vitest.config.ts`: environment `node`, hapus plugin React dan setup jest-dom.
- `package.json`: hapus dependency frontend yang sudah tidak dipakai.
- Mobile: `EXPO_PUBLIC_API_BASE_URL` di `mobile/src/lib/storage.ts` menjadi prioritas utama,
  fallback ke logika lama (hostUri / localhost:3001 / IP LAN) untuk development.
- CORS: `src/proxy.ts` mengizinkan origin yang sama dengan `WEB_ORIGIN` selain origin dev.
- Dokumentasi diperbarui; arsip `docs/superpowers/plans/**` tidak disentuh.

## Verification

- `npx tsc --noEmit` (root dan mobile) bersih.
- `npm test -- --run` seluruh test backend lulus.
- `npm run build` berhasil tanpa root layout.
- Endpoint `/` dan `/api/health` merespons JSON.
- Expo app masih bisa login memakai base URL development.

## Builder check

Tidak diperlukan: ruang lingkup sudah dipetakan dengan subagent eksplorasi sebelum desain ini ditulis, dan user menyetujui desain ringkas ini langsung.
