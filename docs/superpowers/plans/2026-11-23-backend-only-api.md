# Backend-only API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah repo Next.js menjadi backend API murni untuk aplikasi Expo, siap deploy ke Vercel + Supabase.

**Architecture:** Hapus seluruh UI web dan dependency frontend, pertahankan semua route handler `/api/*` beserta library/auth/DB/migrasi. Tambahkan route status di `/`, dukungan `EXPO_PUBLIC_API_BASE_URL` di mobile, dan CORS untuk origin production.

**Tech Stack:** Next.js 16.4.2 App Router, Better Auth, Drizzle ORM, PostgreSQL/Supabase, exceljs, Vitest + PGlite, Expo/React Native.

**Spec:** `docs/superpowers/specs/2026-11-23-backend-only-api-design.md`

## Global Constraints

- Port backend lokal: 3001 (port 3000 dipakai proyek lain).
- Semua endpoint `/api/*`, schema DB, migrasi, dan logika bisnis tidak boleh berubah.
- `react` + `react-dom` tetap ada sebagai peer dependency Next.js.
- UI web tidak boleh tersisa; arsip `docs/superpowers/plans/**` tidak disentuh.
- Semua teks dan dokumentasi dalam bahasa Indonesia.

## Review Focus

- Build tanpa root layout: `npm run build` harus tetap sukses dengan hanya `route.ts`.
- Origin production: `EXPO_PUBLIC_API_BASE_URL` harus dipakai mobile dan diizinkan CORS/auth.
- Cookie session: base URL web/native tetap konsisten dengan `BETTER_AUTH_URL`.
- Health/root endpoint: `/` dan `/api/health` merespons JSON.
- Dependency yang terhapus tidak boleh masih diimpor oleh kode backend yang tersisa.

---

### Task 1: Hapus frontend, pertahankan API

**Files:**
- Delete: `src/app/(app)/**`, `src/app/login/**`, `src/app/r/**`, `src/app/offline/**`, `src/app/{page,layout,globals.css,error,global-error,loading,not-found,sw}.tsx|ts|css`, `src/components/**`, `src/hooks/**`, `src/lib/{api-client,cn,format}.ts`, `src/lib/auth/client.ts`, `public/**`
- Create: `src/app/route.ts`

- [ ] **Step 1: Hapus file UI dan helper frontend sesuai daftar di atas**
- [ ] **Step 2: Tambah `src/app/route.ts` yang mengembalikan JSON status (nama aplikasi, status ok, tautan `/api/health`)**
- [ ] **Step 3: Verifikasi tidak ada import `@/components`, `@/hooks`, `lucide-react`, `@/lib/cn`, `@/lib/format`, `@/lib/api-client`, `@/lib/auth/client` di kode yang tersisa**
- [ ] **Step 4: Commit**

### Task 2: Sederhanakan konfigurasi dan dependency

**Files:**
- Modify: `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `package.json`
- Delete: `postcss.config.mjs`, `src/tests/setup.ts`

- [ ] **Step 1: `next.config.ts` — hapus wrapper Serwist dan konfigurasi service worker, pertahankan security header**
- [ ] **Step 2: `vitest.config.ts` — environment `node`, hapus plugin React, setupFiles, dan include `.tsx`**
- [ ] **Step 3: `eslint.config.mjs` — hapus ignore `public/sw.js`**
- [ ] **Step 4: `package.json` — hapus dependency frontend yang tidak dipakai; jalankan `npm install` untuk memperbarui lockfile**
- [ ] **Step 5: `npx tsc --noEmit` dan `npm test -- --run` harus lulus**
- [ ] **Step 6: Commit**

### Task 3: Base URL produksi untuk Expo dan CORS

**Files:**
- Modify: `mobile/src/lib/storage.ts`, `src/proxy.ts`, `src/lib/auth/config.ts` (jika perlu)

- [ ] **Step 1: Tambah `EXPO_PUBLIC_API_BASE_URL` sebagai prioritas utama di `getBaseUrl()` dan `getEmbeddedBaseUrl()`, fallback ke logika lama**
- [ ] **Step 2: `src/proxy.ts` — izinkan origin yang sama dengan `WEB_ORIGIN` selain regex origin dev**
- [ ] **Step 3: Pastikan `trustedOrigins` Better Auth mencakup origin produksi (lewat `WEB_ORIGIN`)**
- [ ] **Step 4: `npx tsc --noEmit` di root dan mobile; commit**

### Task 4: Dokumentasi

**Files:** `README.md`, `prd.md`, `docs/backend/README.md`, `docs/qa/{README,regression-checklist,test-plan}.md`, `CONTRIBUTING.md`, `mobile/AGENTS.md`

- [ ] **Step 1: Tulis ulang bagian yang mengasumsikan UI web; nyatakan repo sebagai backend API + aplikasi Expo**
- [ ] **Step 2: Dokumentasikan deploy Vercel/Supabase dan `EXPO_PUBLIC_API_BASE_URL`**
- [ ] **Step 3: Commit**

### Task 5: Verifikasi akhir

- [ ] **Step 1: `npm run build` sukses tanpa root layout**
- [ ] **Step 2: `GET /` dan `GET /api/health` merespons JSON**
- [ ] **Step 3: `npm test -- --run`, `npx tsc --noEmit` root + mobile, `cd mobile && npx expo-doctor`**
- [ ] **Step 4: `git status`, commit, push ke `origin main`**
