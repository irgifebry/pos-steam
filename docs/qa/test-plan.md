# Test Plan — POS Cuci Steam

| | |
|---|---|
| **Versi** | 1.3 |
| **Tanggal** | 28/10/2026 |
| **Diperbarui** | 26/11/2026 |
| **Pemilik** | Dimas (`@dimas22231`) — QA |
| **Status** | Aktif — F1 historis, F2 tersedia; P0 API 25/25 PASS, mobile & F3–F7 pending |
| **Referensi utama** | [`prd.md`](../../prd.md), [`Rencana 01`](../superpowers/plans/2026-10-20-01-fondasi.md), [`CONTRIBUTING.md`](../../CONTRIBUTING.md) |

> Dokumen ini adalah acuan pengujian. Perubahan perilaku bisnis harus diperbarui di `prd.md` lebih dulu, lalu test plan dan test case disesuaikan.

---

## 1. Tujuan

Memastikan setiap acceptance criteria di PRD benar-benar terbukti sebelum fitur dianggap selesai, menemukan bug sebelum pengguna nyata menemukannya, dan menjaga kualitas tetap stabil di setiap fase implementasi.

Test plan ini menjawab:

- Apa yang diuji dan apa yang tidak.
- Di mana dan dengan perangkat apa pengujian dilakukan.
- Siapa yang mengerjakan dan bagaimana alur pelaporan bug.
- Kapan suatu fase dinyatakan layak rilis.

---

## 2. Ruang Lingkup

### 2.1 Termasuk (In Scope)

- Fase di PRD §12 yang masih berlaku: Fondasi, Kasir Inti, Papan Status, Laporan, Offline, Polish.
- **Backend API** (Next.js Route Handlers di `src/app/api/**`) dan **satu klien**, aplikasi Expo/React Native di [`mobile/`](../../mobile) (SDK ~58, React Navigation v7). Tidak ada klien web Next.js. Kontrak bersama: sukses `{ data: ... }`, error `{ error: { code, message } }`.
- Khusus mobile: tema terang, 4 tab (Kasir, Antrean, Laporan, Pengaturan), alur kasir → antrean → pembayaran, aturan ROYALTY, dan manajemen master data lewat aksi **Hapus**.
- Pengujian fungsional endpoint API, validasi input, otorisasi satu role (`admin`), integritas data, regresi, kompatibilitas perangkat, dan performa dasar.
- Pengujian manual/exploratory oleh QA dan verifikasi test otomatis yang ditulis developer.
- UAT dengan skenario operasional outlet (kasir sibuk, sinyal hilang, printer gagal).

### 2.2 Tidak Termasuk (Out of Scope) — Fase Ini

Sesuai PRD §4.2, dengan penyesuaian karena pengujian berfokus pada backend API dan klien Expo:

- Member/loyalitas/poin, notifikasi WhatsApp otomatis, payment gateway/QRIS otomatis.
- Build native mentah dan distribusi toko aplikasi (direktori `ios/`/`android/` dihasilkan otomatis, EAS build/submit) — fokus QA adalah perilaku lewat Expo Web/emulator dan kontrak API, bukan packaging toko.
- Multi-outlet/multi-cabang.
- Akuntansi formal (jurnal, buku besar), manajemen stok bahan kimia.
- Load testing skala besar dan penetration test profesional. Untuk keamanan, QA hanya melakukan pemeriksaan dasar (secret, RBAC, XSS/SQLi, cookie).

---

## 3. Strategi Pengujian

| Level | Alat | Pelaksana | Fokus |
|---|---|---|---|
| **Static check** | `tsc`, ESLint, `next build` | Developer, diverifikasi QA | Error tipe, lint, build produksi |
| **Unit test** | Vitest | Developer, direview QA | Schema Zod, service layer, format Rupiah/tanggal |
| **Integration test API** | Vitest + PGlite | Developer, direview QA | Route Handler, otorisasi, constraint DB, idempotensi, CORS `src/proxy.ts` |
| **Contract/manual API** | curl/Postman/Thunder Client | QA | Root `/` JSON status, health, status code, envelope `{ data }` / `{ error: { code, message } }`, RBAC, validasi |
| **E2E mobile** | Expo Web `localhost:8081`, emulator/HP dengan Expo Go atau dev build | QA | 4 tab, tema terang, Kasir → Antrean → pembayaran, ROYALTY, Hapus pada master data |
| **Exploratory** | Charter berbasis risiko | QA | Celah di luar acceptance criteria |
| **UAT** | Skenario outlet | QA + pemilik/kasir | Kesiapan operasional |

**Prinsip:**

- QA tidak menggantikan unit test developer. QA memastikan test ada, membaca coverage area kritis, dan mengeksekusi acceptance/exploratory.
- Setiap bug yang ditemukan harus bisa direproduksi. Jika tidak, catat sebagai "intermittent" dengan bukti.
- Prioritaskan pengujian berbasis risiko, bukan sekadar mengejar jumlah test case.

---

## 4. Lingkungan & Perangkat

| Lingkungan | Kegunaan | Catatan |
|---|---|---|
| **Local** | Development & test otomatis | `npm run dev`, PGlite untuk test API |
| **Vercel Preview** | Verifikasi commit sebelum/sesudah push | Satu deployment per commit; QA retest di sini |
| **Production** | Smoke test setelah rilis | Jangan pakai data uji di production |

**Menjalankan backend & mobile (local):**

```bash
# Terminal 1 — backend API (dari root repo; port 3000 dipakai proyek lain)
npm run dev -- -p 3001     # API di http://localhost:3001 (tanpa UI)

# Terminal 2 — mobile web preview (dari folder mobile/)
cd mobile
npm run web                # Expo Web → http://localhost:8081
```

Expo Web memerlukan **CORS proxy** di [`src/proxy.ts`](../../src/proxy.ts) (matcher `/api/:path*`): proxy menambahkan header CORS untuk origin `localhost`/IP jaringan lokal **dan** origin dari `WEB_ORIGIN`/`BETTER_AUTH_URL` (comma-separated didukung) pada preflight `OPTIONS` (204) maupun response. Tanpa ini, request dari `http://localhost:8081` ke `http://localhost:3001` ditolak browser. Aplikasi native (Expo Go/dev build) tidak terkena CORS, tetapi tetap memakai backend yang sama. Untuk produksi, build Expo dengan `EXPO_PUBLIC_API_BASE_URL=https://<backend>.vercel.app` agar tidak bergantung alamat LAN.

**Verifikasi terkini (lokal):**

| Perintah / item | Hasil |
|---|---|
| `npm test` (root) | **27 file / 120 test lulus** (termasuk test CORS proxy) |
| `npx tsc --noEmit` (root & `mobile/`) | bersih |
| `npx expo-doctor` (`mobile/`) | **20/20** |
| P0 API E2E (26/11/2026) | **25/25 PASS** — [laporan](./test-runs/2026-11-26-p0-api.md) |
| Preview | Expo Web `http://localhost:8081` ↔ backend `http://localhost:3001` |

**Matriks perangkat:**

| Perangkat | Prioritas | Yang diuji |
|---|---|---|
| Expo Web (Chrome, `localhost:8081`) | Utama | Seluruh alur mobile via browser; wajib dengan CORS proxy aktif |
| Emulator/HP Android 8+ + Expo Go atau dev build | Utama | Tema terang, 4 tab, alur pembayaran, struk |
| Android mid-range (RAM 3–4 GB) | Utama | Performa aplikasi, koneksi ke backend |
| iOS (Expo Go/dev build) | Cadangan | Tema terang, 4 tab, alur pembayaran |

**Jaringan:**

- Normal (Wi-Fi/4G).
- Slow 3G (throttling DevTools).
- Offline/airplane mode (pengujian penuh di F6; F1 hanya kontrak API).

**Periferal:**

- Printer thermal Bluetooth 58mm untuk struk dari mobile (F2+).

**Aturan promosi environment:** Local → Preview → Production. Bug hanya ditutup setelah retest di environment tempat bug ditemukan, minimal di Preview.

---

## 5. Data Uji

### 5.1 Akun

| Akun | Role | PIN | Kegunaan |
|---|---|---|---|
| `admin@pos.test` | admin | `123456` | Akun seed; **wajib diganti di luar local** |
| `qa.inactive@pos.test` | admin | `778899` | Buat manual lewat `/api/users` lalu nonaktifkan; pengujian sesi mati |

> Seed hanya membuat akun `admin@pos.test` (nama `testing`) dan satu outlet kosong. Tidak ada akun lain, paket, add-on, bank, atau transaksi contoh — siapkan data uji lewat API/mobile sebelum menjalankan skenario.

> Role yang dikenal backend saat ini **hanya `admin`** (`roleSchema` di `src/lib/schemas.ts`). Tidak ada peran lain. PIN minimal 6 karakter; PRD §5.1/§9.3 masih menyebut PIN 4 angka — lihat §14 dan catatan implementasi di puncak `prd.md`.


### 5.2 Master Data Uji

| Tipe | Nama | Harga | Durasi |
|---|---|---|---|
| Motor | `QA - Reguler` | Rp 25.000 | 15 menit |
| Motor | `QA - Komplit` | Rp 35.000 | 30 menit |
| Motor | `QA - Premium` | Rp 50.000 | 45 menit |
| Mobil | `QA - Reguler` | Rp 40.000 | 30 menit |
| Mobil | `QA - Komplit` | Rp 60.000 | 45 menit |
| Mobil | `QA - Premium` | Rp 85.000 | 60 menit |

| Add-on | Harga | Berlaku |
|---|---|---|
| `QA - Semprot Wax` | Rp 10.000 | Motor & Mobil |
| `QA - Ojek Ban` | Rp 15.000 | Motor |
| `QA - Semprot Interior` | Rp 25.000 | Mobil |
| `QA - Poles Kaca` | Rp 20.000 | Motor & Mobil |

> Harga di atas adalah **data uji**, bukan keputusan bisnis. Harga final diisi lewat Pengaturan.

**Konvensi:**

- Semua data uji memakai prefix `QA -` agar mudah dikenali.
- Jangan menghapus data transaksi; nonaktifkan atau tandai sebagai data uji.
- Untuk pengujian destruktif, gunakan database lokal/test (PGlite), bukan Supabase production.

---

## 6. Prioritas & Severity

### 6.1 Prioritas (Urgensi Bisnis)

| Prioritas | Arti | Aturan |
|---|---|---|
| **P0** | Blocker | Wajib lulus sebelum merge/rilis. Jika gagal, fitur tidak boleh dirilis |
| **P1** | High | Wajib lulus sebelum rilis; boleh ditunda hanya dengan persetujuan PO |
| **P2** | Medium | Dijadwalkan; tidak menghambat rilis |
| **P3** | Low | Kosmetik/backlog |

### 6.2 Severity (Dampak Teknis)

| Severity | Arti | Contoh |
|---|---|---|
| **S1 — Critical** | Data hilang, kebocoran keamanan, transaksi tidak bisa dilakukan, duplikasi transaksi | Service key bocor; offline sync menggandakan order; kasir tidak bisa login |
| **S2 — Major** | Fitur utama rusak tanpa workaround | Paket tidak bisa dibuat; laporan omzet salah; struk tidak tercetak |
| **S3 — Minor** | Ada workaround | Filter salah urutan; validasi kurang jelas; layout geser sedikit |
| **S4 — Trivial** | Kosmetik | Typo, ikon tidak sejajar |

### 6.3 Fokus Prioritas Mobile

| Prioritas | Area mobile | Alasan |
|---|---|---|
| **P0** | Login, tema terang, dan tepat 4 tab (Kasir, Antrean, Laporan, Pengaturan) | Fondasi navigasi; salah satu saja gagal menghentikan operasi kasir |
| **P0** | Pembayaran saat **Mulai Cuci** → status `proses`; order total 0 langsung `proses`; Kasir hanya "Buat antrean" | Alur inti dan titik serah terima Antrean; risiko order tanpa pembayaran |
| **P0** | Aturan ROYALTY: Reguler gratis, paket lain `royaltyPrice`, add-on tetap bayar, `discount` tercatat sebagai piutang | Salah harga berdampak langsung ke kas/piutang |
| **P1** | Aksi **Hapus** pada master data; daftar hanya record aktif; tab Motor/Mobil/Semua; form paket tanpa durasi | Konsistensi data master dengan kontrak API |
| **P1** | `Nama Kendaraan` → `vehicleName` → `vehicles.brand`; struk modal terang; bar ringkasan mengambang; subtotal disembunyikan tanpa pajak/diskon | Kesesuaian field UI dengan kontrak API |
| **P1** | CORS proxy (`src/proxy.ts`) dan koneksi ke backend; `EXPO_PUBLIC_API_BASE_URL` untuk produksi | Tanpa ini seluruh pengujian mobile web/produksi blokir |
| **P2** | Sub-halaman Pengaturan (Paket Layanan, Add-on, Rekening Bank, Pengguna); konsistensi envelope `{ data }` / `{ error }` | Pendukung, bukan perilaku bisnis inti |

**Prioritas ditentukan bersama PO/developer saat triage.** QA mengusulkan severity dan dampak, bukan memutuskan sendiri prioritas bisnis.

---

## 7. Entry & Exit Criteria

### 7.1 Entry Criteria (Sebelum Pengujian Fase)

- [ ] Build tersedia di environment yang disepakati (minimal Vercel Preview).
- [ ] Acceptance criteria fase sudah ada di PRD/rencana implementasi.
- [ ] Test case fase terkait sudah siap dan direview.
- [ ] Data uji dan akun tersedia.
- [ ] Tidak ada bug S1/S2 terbuka dari fase sebelumnya.
- [ ] Developer menyatakan fitur siap diuji (bukan setengah jadi).

### 7.2 Exit Criteria (Fase Dinyatakan Lulus)

- [ ] 100% test case P0 dieksekusi.
- [ ] Minimal 95% test case P1 dieksekusi.
- [ ] Pass rate P0 = 100%, P1 ≥ 95%.
- [ ] Tidak ada bug S1/S2 terbuka.
- [ ] Bug S3/S4 yang tersisa sudah diterima PO dan dijadwalkan.
- [ ] Regression checklist fase terkait lulus.
- [ ] UAT sign-off untuk rilis fase.
- [ ] Test summary report diperbarui.

### 7.3 Exit Criteria Khusus F1

Mengacu pada Verifikasi Akhir Rencana 01:

- [ ] `npm test` semua PASS (27 file / 120 test), tidak ada test skip.
- [ ] `npm run typecheck` exit 0.
- [ ] `npm run lint` tanpa error.
- [ ] `npm run build` sukses; semua route API terdeteksi.
- [ ] Root `/` mengembalikan JSON status dan `GET /api/health` 200.
- [ ] Login `admin@pos.test` / `123456` berhasil setelah seed (nama tampilan `testing`).
- [ ] Endpoint master data berfungsi: tambah, edit, hapus (`active=false`) tersimpan di database; di mobile memakai aksi **Hapus** (lihat regresi mobile §5).
- [ ] Review Focus 1–5 Rencana 01 terbukti (lihat test case F1).

---

## 8. Alur Kerja Bug

```
Baru → Triage → In Progress → Fixed → Ready for Retest → Closed
                                                ↓
                                            Reopened
```

| Tahap | Siapa | Yang dilakukan |
|---|---|---|
| **Baru** | QA | Buat issue dengan template bug report, lampirkan bukti |
| **Triage** | QA + developer/PO | Tentukan severity, prioritas, dan pemilik |
| **In Progress** | Developer | Perbaiki langsung di `main`; commit fokus menyebut issue |
| **Fixed** | Developer | Deploy ke Preview, minta retest |
| **Ready for Retest** | QA | Jalankan ulang langkah reproduksi + regression area terkait |
| **Closed** | QA | Hanya jika terbukti lolos dan bukti retest dilampirkan |
| **Reopened** | QA | Jika masih gagal; tambahkan bukti baru |

**SLA yang disarankan:**

| Severity | Respons awal | Target perbaikan |
|---|---|---|
| S1 | Hari yang sama | Hari yang sama / sebelum rilis |
| S2 | 1 hari kerja | 2 hari kerja |
| S3 | 2 hari kerja | Sprint berikutnya |
| S4 | 1 minggu | Backlog |

**Aturan pelaporan:**

- Satu issue = satu bug.
- Sertakan ID test case (mis. `F1-042`).
- Sertakan environment, commit/deployment, perangkat, langkah, expected vs actual, bukti.
- Jangan menutup bug tanpa retest.
- Kerentanan keamanan **jangan** dilaporkan sebagai issue publik; hubungi maintainer secara privat.

---

## 9. Definition of Done (QA)

Sebuah commit/fitur dianggap selesai dari sisi QA jika:

- [ ] Test case terkait sudah dieksekusi dan statusnya diperbarui.
- [ ] Bukti uji dilampirkan (screenshot/video/log untuk UI; output test untuk otomatis).
- [ ] Bug yang ditemukan sudah dilaporkan dan ditriase.
- [ ] Regression area terkait sudah dijalankan.
- [ ] Tidak ada bug S1/S2 terbuka.
- [ ] Perilaku sesuai acceptance criteria PRD.
- [ ] Dokumentasi (PRD/README/test case) diperbarui bila perilaku berubah.
- [ ] QA menulis sign-off di laporan run atau issue rilis.

---

## 10. Roadmap QA per Fase

| Fase | Fokus QA | Risiko utama |
|---|---|---|
| **F1 — Fondasi** | Auth, RBAC, master data, kontrak API, seed | Sesi user nonaktif, eskalasi role, duplikasi master data, service key bocor |
| **F2 — Kasir Inti** | Transaksi ≤ 30 detik, nomor antrean/invoice, ROYALTY/OJOL, pembayaran tunai/transfer, struk, mobile E2E | Invoice ganda, kembalian salah, price snapshot berubah, verifikasi transfer |
| **F3 — Papan Status** | Timer, transisi status, filter, polling | Timer reset, status tidak sinkron, order lunas masih tampil |
| **F4 — Laporan** | Rekonsiliasi omzet, filter periode, export CSV, cetak | Omzet tidak cocok, timezone, CSV rusak di Excel |
| **F6 — Offline** | Airplane mode, antrean sync, idempotensi, indikator pending | Duplikasi transaksi, konflik nomor invoice, data master basi |
| **F7 — Polish** | Audit log, error handling, empty state, PDF, validasi akhir | Aksi sensitif tanpa audit, error membocorkan detail internal |

> **Status 26/11/2026:** test case F2 sudah tersedia di [`test-cases/f2-kasir-inti.md`](./test-cases/f2-kasir-inti.md); P0 API lulus 25/25, mobile E2E dan sisa kasus negatif belum. F3–F7 ditulis setelah F2 stabil, sesuai aturan di [`docs/superpowers/plans/README.md`](../superpowers/plans/README.md).

---

## 11. Area Risiko & Fokus Pengujian

| Area | Dampak jika gagal | Fokus uji |
|---|---|---|
| **Offline & idempotensi** | Transaksi ganda/hilang | `client_id` unik, retry, batch sync, indikator pending |
| **Price snapshot** | Omzet/laporan kacau | Edit harga master, cek transaksi lama |
| **RBAC** | Kasir/operator bisa ubah data sensitif | Matriks role di setiap endpoint, bukan hanya UI |
| **Nomor invoice & antrean** | Struk ambigu, antrean bentrok | Unik per outlet/tanggal/tipe, reset harian |
| **Audit log** | Tidak ada jejak pertanggungjawaban | Void, ubah harga, user |
| **Timezone & reset harian** | Nomor/antrean salah hari | Uji sekitar tengah malam Asia/Jakarta |
| **Mobile: pembayaran** | Order `menunggu` tanpa pembayaran, kasir bingung kapan bayar | Bayar di **Mulai Cuci**, status `proses`, order total 0 langsung `proses` |
| **Mobile: ROYALTY** | Harga/potongan salah | Reguler gratis, `royaltyPrice`, add-on bayar, `discount` sebagai piutang |
| **CORS Expo Web & produksi** | Semua request mobile web gagal | `src/proxy.ts`, origin `localhost` + `WEB_ORIGIN`/`BETTER_AUTH_URL`, preflight `OPTIONS /api/*` |
| **Base URL mobile** | Aplikasi produksi mengarah ke alamat localhost/LAN | `EXPO_PUBLIC_API_BASE_URL` saat build/EAS update |
| **Printer Bluetooth** | Struk tidak keluar | Koneksi, reprint dari mobile |
| **Supabase cold start** | Query pertama lambat | Ukur warm vs cold; cache master data |
| **HP bersama & PIN** | Salah identitas/audit | Ganti operator, sesi berganti, PIN reset |
| **CSV export** | Tidak terbuka di Excel | UTF-8, separator, angka Rupiah |

---

## 12. Metrik

Dipantau per fase, bukan untuk menilai individu:

- **Execution progress:** jumlah test case direncanakan/dieksekusi/lulus/gagal/blocked.
- **Pass rate:** terutama P0 dan P1.
- **Defect:** jumlah terbuka per severity, reopen rate, escaped defect (bug lolos ke production).
- **Performance:** durasi transaksi, load halaman, latency API.
- **Quality gate:** P0 100%, P1 ≥ 95%, tidak ada S1/S2 terbuka.

---

## 13. Artefak & Aturan Kontribusi

| Artefak | Lokasi |
|---|---|
| Test plan | `docs/qa/test-plan.md` |
| Test case F1 (historis) | `docs/qa/test-cases/f1-fondasi.md` |
| Test case F2 | `docs/qa/test-cases/f2-kasir-inti.md` |
| Checklist regresi | `docs/qa/regression-checklist.md` (§1–§4 API, §5 Regresi Mobile) |
| Template laporan run | `docs/qa/test-run-template.md` |
| Laporan run terbaru | `docs/qa/test-runs/2026-11-26-p0-api.md` |
| Backend API | `src/app/api/**`, `src/lib/**` (kontrak di `docs/backend/README.md`) |
| Klien mobile | `mobile/` (Expo SDK ~58, React Navigation v7) |
| Proxy CORS | `src/proxy.ts` |
| Template bug | `.github/ISSUE_TEMPLATE/bug_report.yml` |
| Template PR | `.github/pull_request_template.md` |

**Aturan repo (mengikuti [`AGENTS.md`](../../AGENTS.md)):**

- Bekerja langsung di `main`; jangan membuat branch fitur, fix, atau QA.
- Commit terkait dalam sedikit commit fokus di `main`, lalu push ke `origin main`.
- Sebelum push: cek `git status`, jalankan check relevan, dan pastikan `main` sama dengan `origin/main`.
- Commit mengikuti Conventional Commits: `test(kasir): tambah test idempotensi`, `docs(qa): tambah test case F2`.
- Jangan force-push atau menulis ulang history bersama.

---

## 14. Catatan & Pertanyaan Terbuka

Temuan dokumentasi/kontrak yang masih terbuka setelah implementasi F1–F2. Status diperbarui per 26/11/2026; butir yang sudah diputuskan tetap dicatat sebagai jejak keputusan.

| # | Temuan | Dampak | Rekomendasi | Status |
|---|---|---|---|---|
| 1 | **Panjang PIN berbeda**: PRD §5.1 dan §9.3 menyebut PIN 4 angka; README dan Rencana 01 mengunci minimal 6 karakter | Login/UX dan test case bisa salah | Test mengikuti 6 karakter | Selesai — `pinSchema` 6–12 karakter; login memakai field `password` |
| 2 | **Casing status berbeda**: PRD memakai `MENUNGGU/PROSES/SELESAI/DIBATALKAN`; schema Rencana 01 memakai default `'menunggu'` huruf kecil | Filter/laporan/status bisa tidak cocok di F2 | Kunci satu format | Selesai — API/DB memakai lowercase `menunggu/proses/selesai/paid/dibatalkan` |
| 3 | **Cakupan endpoint `/api/settings`**: PRD §8 menyebut Pengaturan hanya Admin; Rencana 01 Task 8 membuka GET untuk semua peran | Kontrak endpoint kurang jelas | Pastikan hanya mengembalikan data outlet dan bank | Selesai — `GET/PATCH /api/settings` admin-only, GET = outlet + bank aktif |
| 4 | **`GET /api/users?light=1`** tidak ada di kontrak API PRD §10 | Kontrak tidak lengkap; risiko field bocor | Dokumentasikan di PRD; pastikan hanya `id,name,role` | Selesai — terdokumentasi di `docs/backend/README.md` dan diverifikasi P0 (hanya 3 field) |
| 5 | **Cakupan audit log**: Global Constraints mewajibkan semua endpoint sensitif; Rencana 01 hanya eksplisit untuk user | Perubahan harga/pajak/bank bisa tanpa jejak | Tentukan daftar aksi yang diaudit di F1/F2 | Perlu keputusan |
| 6 | **PIN admin seed** `123456` (nama `testing`) | Risiko keamanan jika dipakai di production | Wajib ganti setelah seed di environment non-local | Mitigasi |
| 7 | **Harga seed 1000** hanya placeholder | Data UAT tidak realistis | Ganti lewat Pengaturan sebelum UAT | Tindakan |
| 8 | **Dokumentasi setup**: CONTRIBUTING mengarah ke `Najwan48/pos-cuci-steam`, remote aktual `irgifebry/pos-steam`; Node 20+ vs Rencana 01 Node ≥22 | QA/developer baru gagal setup | Perbaiki URL dan versi Node | Perlu perbaikan |
| 9 | **PRD §9.1 masih menyebut "Express API"** padahal stack Next.js Route Handlers | Membingungkan kontributor | Perbarui teks PRD | Perlu perbaikan |
| 10 | **Constraint invoice/antrean/payment** belum sepenuhnya di DB (unik invoice ada; unik antrean per hari/tipe dan amount > 0 belum) | Risiko duplikasi di F2 | Tambahkan constraint atau test service yang ketat | Risiko F2 |
| 11 | **Pembulatan pajak**: `tax_percent numeric(5,2)` vs total Rupiah integer | Selisih 1 rupiah pada struk/laporan | Tetapkan aturan pembulatan (mis. half-up) dan uji | Perlu keputusan |
| 12 | **Timezone reset harian** belum ditetapkan | Antrean/invoice salah hari di batas tengah malam | Tetapkan `Asia/Jakarta` dan uji boundary | Perlu keputusan |

---

## 15. Riwayat Perubahan

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1.0 | 28/10/2026 | Dokumen awal | Dimas |
| 1.1 | 21/11/2026 | Ruang lingkup dua klien (web + mobile), environment Expo & CORS proxy, verifikasi terkini, fokus prioritas mobile | Dimas |
| 1.2 | 23/11/2026 | Hapus ruang lingkup klien web (frontend dihapus); fokus backend API + Expo, `EXPO_PUBLIC_API_BASE_URL`, CORS origin produksi, verifikasi 27 file/119 test | Dimas |
| 1.3 | 26/11/2026 | Tambah artefak F2, template/laporan test run, status P0 API 25/25 PASS, verifikasi ulang 27 file/120 test, selesaikan open question PIN/casing/settings/users-light, selaraskan aturan kontribusi dengan `AGENTS.md` | Dimas |
