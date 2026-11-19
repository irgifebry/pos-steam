# React Native Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi mobile React Native (Expo) mandiri di direktori `app/` yang mencakup seluruh fitur POS cuci steam (Kasir, Antrean, Laporan, Karyawan/Absensi, Pengaturan, Autentikasi PIN/Email) dan terhubung langsung ke backend API Next.js.

**Architecture:** Menggunakan Expo SDK 52+ dengan TypeScript, React Navigation (Bottom Tabs + Stack) untuk navigasi 5 modul utama yang konsisten dengan web shell. Network client menggunakan Axios/fetch dengan session/cookie & token management (AsyncStorage) yang kompatibel dengan Better Auth di Next.js route handlers.

**Tech Stack:** Expo / React Native, TypeScript, Expo Router / React Navigation, Lucide React Native, Async Storage.

**Spec:** `/Volumes/Backup/Irgi/NyobaNyobaBikinAplikasiWeb/pos-cuci-steam/prd.md`

## Global Constraints
- Dibangun mandiri di dalam folder `app/` tanpa merusak repo Next.js utama.
- Bahasa UI & notifikasi: Bahasa Indonesia.
- Kompatibel dengan Route Handlers backend Next.js (`/api/*`).
- Penanganan offline & storage lokal menggunakan AsyncStorage.

---

### Task 1: Scaffolding Expo React Native App di `app/`

**Files:**
- Create: `app/package.json`
- Create: `app/app.json`
- Create: `app/tsconfig.json`
- Create: `app/App.tsx`

- [ ] **Step 1: Setup dasar konfigurasi Expo di `app/`**
- [ ] **Step 2: Install dependencies expo, react-native, react-navigation, async-storage, lucide-react-native**
- [ ] **Step 3: Pastikan `npm run typecheck` atau testing awal di `app/` berjalan bersih**
- [ ] **Step 4: Commit hasil scaffolding dasar**

### Task 2: Service Layer & API Client di Mobile (`app/src/lib/api.ts`)

**Files:**
- Create: `app/src/lib/api.ts`
- Create: `app/src/lib/storage.ts`
- Create: `app/src/types/index.ts`

- [ ] **Step 1: Buat API client yang mendukung Base URL backend (configurable via environment/setting)**
- [ ] **Step 2: Implementasikan session & credential handling untuk Better Auth (cookie/bearer)**
- [ ] **Step 3: Buat interface TypeScript transaksi, antrean, paket, karyawan, absensi**
- [ ] **Step 4: Commit API client mobile**

### Task 3: Fitur Autentikasi (Login & PIN Operator)

**Files:**
- Create: `app/src/screens/LoginScreen.tsx`
- Create: `app/src/context/AuthContext.tsx`
- Create: `app/src/components/PinPad.tsx`

- [ ] **Step 1: Buat AuthContext untuk menyimpan status login, user info, dan active outlet**
- [ ] **Step 2: Buat layar Login dengan email/password & switch keypad PIN 6 digit**
- [ ] **Step 3: Hubungkan ke endpoint `/api/auth/sign-in/email` dan `/api/auth/get-session`**
- [ ] **Step 4: Commit modul auth mobile**

### Task 4: Modul Kasir & Transaksi Baru (`app/src/screens/KasirScreen.tsx`)

**Files:**
- Create: `app/src/screens/KasirScreen.tsx`
- Create: `app/src/components/VehicleSelector.tsx`
- Create: `app/src/components/PackageList.tsx`
- Create: `app/src/components/PaymentModal.tsx`

- [ ] **Step 1: Tampilkan pemilihan kendaraan (Motor / Mobil), daftar Paket Cuci, dan Add-on dari API**
- [ ] **Step 2: Input nomor plat, nama pelanggan, dan catatan**
- [ ] **Step 3: Modal pembayaran (Tunai / Transfer Bank) dengan kalkulasi kembalian**
- [ ] **Step 4: Integrasi POST ke `/api/orders` dan `/api/orders/[id]/payments`**
- [ ] **Step 5: Tampilkan modal struk sukses dengan tombol share WhatsApp digital receipt (`/r/[token]`)**
- [ ] **Step 6: Commit modul kasir**

### Task 5: Modul Papan Status Antrean (`app/src/screens/AntreanScreen.tsx`)

**Files:**
- Create: `app/src/screens/AntreanScreen.tsx`
- Create: `app/src/components/QueueCard.tsx`

- [ ] **Step 1: Fetch list antrean hari ini dari `/api/board` atau `/api/orders`**
- [ ] **Step 2: Filter tab (Semua, Menunggu, Proses, Selesai, Dibatalkan)**
- [ ] **Step 3: Tombol aksi status: Mulai Cuci (Proses), Selesai Cuci, dan Batalkan dengan alasan**
- [ ] **Step 4: Polling / refresh data antrean**
- [ ] **Step 5: Commit modul antrean**

### Task 6: Modul Laporan & Ringkasan Omzet (`app/src/screens/LaporanScreen.tsx`)

**Files:**
- Create: `app/src/screens/LaporanScreen.tsx`
- Create: `app/src/components/StatCard.tsx`

- [ ] **Step 1: Fetch ringkasan omzet harian dari `/api/dashboard/today` dan `/api/reports/omzet`**
- [ ] **Step 2: Tampilkan breakdown per metode pembayaran (Tunai vs Transfer) dan paket terlaris**
- [ ] **Step 3: Tampilkan riwayat transaksi hari ini**
- [ ] **Step 4: Commit modul laporan**

### Task 7: Modul Karyawan & Absensi (`app/src/screens/KaryawanScreen.tsx`)

**Files:**
- Create: `app/src/screens/KaryawanScreen.tsx`
- Create: `app/src/screens/AbsensiScreen.tsx`

- [ ] **Step 1: Fetch daftar karyawan dari `/api/users`**
- [ ] **Step 2: Form absensi harian (Masuk, Izin, Sakit, Alpa) dan kirim ke `/api/attendance`**
- [ ] **Step 3: Rekap absensi bulanan & estimasi gaji**
- [ ] **Step 4: Commit modul karyawan & absensi**

### Task 8: Modul Pengaturan & Navigasi Utama (`app/src/navigation/*`)

**Files:**
- Create: `app/src/navigation/RootNavigator.tsx`
- Create: `app/src/navigation/BottomTabNavigator.tsx`
- Create: `app/src/screens/PengaturanScreen.tsx`

- [ ] **Step 1: Susun navigasi 5 Tab utama: Kasir, Antrean, Laporan, Karyawan, Pengaturan**
- [ ] **Step 2: Layar Pengaturan: Master Paket, Add-on, Bank, Outlet, Ubah URL Server API, Logout**
- [ ] **Step 3: Pengujian alur navigasi dan verifikasi kelengkapan seluruh fitur**
- [ ] **Step 4: Commit akhir aplikasi mobile**
