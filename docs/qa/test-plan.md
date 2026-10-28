# Test Plan — POS Cuci Steam

| | |
|---|---|
| **Versi** | 1.0 |
| **Tanggal** | 28/10/2026 |
| **Pemilik** | Dimas (`@dimas22231`) — QA |
| **Status** | Aktif — test case F1 siap dieksekusi setelah implementasi F1 selesai |
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

- Seluruh 7 fase di PRD §12: Fondasi, Kasir Inti, Papan Status, Laporan, Absensi & Gaji, Offline, Polish.
- Pengujian fungsional, validasi input, otorisasi per role, integritas data, regresi, kompatibilitas perangkat, PWA, dan performa dasar.
- Pengujian manual/exploratory oleh QA dan verifikasi test otomatis yang ditulis developer.
- UAT dengan skenario operasional outlet (kasir sibuk, sinyal hilang, printer gagal).

### 2.2 Tidak Termasuk (Out of Scope) — Fase Ini

Sesuai PRD §4.2:

- Member/loyalitas/poin, notifikasi WhatsApp otomatis, payment gateway/QRIS otomatis.
- Aplikasi native (fokus PWA).
- Multi-outlet/multi-cabang.
- Akuntansi formal (jurnal, buku besar), manajemen stok bahan kimia.
- Load testing skala besar dan penetration test profesional. Untuk keamanan, QA hanya melakukan pemeriksaan dasar (secret, RBAC, XSS/SQLi, cookie).

---

## 3. Strategi Pengujian

| Level | Alat | Pelaksana | Fokus |
|---|---|---|---|
| **Static check** | `tsc`, ESLint, `next build` | Developer, diverifikasi QA | Error tipe, lint, build produksi |
| **Unit test** | Vitest | Developer, direview QA | Schema Zod, service layer, format Rupiah/tanggal |
| **Integration test API** | Vitest + PGlite + MSW | Developer, direview QA | Route Handler, otorisasi, constraint DB, idempotensi |
| **Component test UI** | Vitest + Testing Library | Developer, direview QA | BottomNav, form login, halaman master data |
| **Contract/manual API** | curl/Postman/Thunder Client | QA | Status code, envelope error, RBAC, validasi |
| **E2E manual** | Browser + HP fisik | QA | Alur nyata dari login sampai transaksi |
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
| **Vercel Preview** | Verifikasi PR | Satu preview per PR; QA retest di sini |
| **Production** | Smoke test setelah rilis | Jangan pakai data uji di production |

**Matriks perangkat:**

| Perangkat | Prioritas | Yang diuji |
|---|---|---|
| Android 8+ Chrome | Utama | Alur kasir, PWA install, Web Bluetooth (F2+) |
| Android mid-range (RAM 3–4 GB) | Utama | Performa, layout 360x640 |
| iOS Safari 16+ | Cadangan | PWA, login, layout; Web Bluetooth tidak diharapkan |
| Desktop Chrome/Edge | Sekunder | Halaman admin/Pengaturan, laporan, cetak A4 |

**Jaringan:**

- Normal (Wi-Fi/4G).
- Slow 3G (throttling DevTools).
- Offline/airplane mode (pengujian penuh di F6; F1 hanya app shell).

**Periferal:**

- Printer thermal Bluetooth 58mm (F2+).
- Printer A4 / print-to-PDF untuk laporan.

**Aturan promosi environment:** Local → Preview → Production. Bug hanya ditutup setelah retest di environment tempat bug ditemukan, minimal di Preview.

---

## 5. Data Uji

### 5.1 Akun

| Akun | Role | PIN | Kegunaan |
|---|---|---|---|
| `admin@pos.test` | admin | `admin123` | Akun seed; **wajib diganti di luar local** |
| `qa.kasir@pos.test` | kasir | `112233` | Pengujian kasir & operator switcher |
| `qa.operator@pos.test` | operator | `445566` | Pengujian akses terbatas |
| `qa.inactive@pos.test` | kasir | `778899` | Dinonaktifkan; pengujian sesi mati |

> PIN mengikuti keputusan Rencana 01: minimal 6 karakter. PRD §5.1/§9.3 masih menyebut PIN 4 angka — lihat §14.

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

- [ ] `npm test` semua PASS, tidak ada test skip.
- [ ] `npm run typecheck` exit 0.
- [ ] `npm run lint` tanpa error.
- [ ] `npm run build` sukses; `public/sw.js` terbentuk.
- [ ] Login `admin@pos.test` / `admin123` berhasil setelah seed.
- [ ] `/kasir`, `/antrean`, `/laporan`, `/karyawan` terbuka; tab Pengaturan hanya admin.
- [ ] 5 halaman master data berfungsi: tambah, edit, nonaktifkan tersimpan di database.
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
| **In Progress** | Developer | Perbaiki di branch `fix/...`, PR menyebut issue |
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
- Sertakan environment, commit/PR, perangkat, langkah, expected vs actual, bukti.
- Jangan menutup bug tanpa retest.
- Kerentanan keamanan **jangan** dilaporkan sebagai issue publik; hubungi maintainer secara privat.

---

## 9. Definition of Done (QA)

Sebuah PR/fitur dianggap selesai dari sisi QA jika:

- [ ] Test case terkait sudah dieksekusi dan statusnya diperbarui.
- [ ] Bukti uji dilampirkan (screenshot/video/log untuk UI; output test untuk otomatis).
- [ ] Bug yang ditemukan sudah dilaporkan dan ditriase.
- [ ] Regression area terkait sudah dijalankan.
- [ ] Tidak ada bug S1/S2 terbuka.
- [ ] Perilaku sesuai acceptance criteria PRD.
- [ ] Dokumentasi (PRD/README/test case) diperbarui bila perilaku berubah.
- [ ] QA menulis sign-off di PR atau issue rilis.

---

## 10. Roadmap QA per Fase

| Fase | Fokus QA | Risiko utama |
|---|---|---|
| **F1 — Fondasi** | Auth, RBAC, master data, shell 5 tab, PWA install, seed | Sesi user nonaktif, eskalasi role, duplikasi master data, service key bocor |
| **F2 — Kasir Inti** | Transaksi ≤ 30 detik, nomor antrean/invoice, pembayaran tunai/transfer, struk, buka/tutup kas | Invoice ganda, kembalian salah, price snapshot berubah, verifikasi transfer |
| **F3 — Papan Status** | Timer, transisi status, filter, polling | Timer reset, status tidak sinkron, order lunas masih tampil |
| **F4 — Laporan** | Rekonsiliasi omzet, filter periode, export CSV, cetak | Omzet tidak cocok, timezone, CSV rusak di Excel |
| **F5 — Absensi & Gaji** | Absensi harian, rekap bulanan, hitung gaji, slip PDF, finalize | Salah hitung lembur, slip finalized bisa diedit, audit tidak lengkap |
| **F6 — Offline** | Airplane mode, antrean sync, idempotensi, indikator pending | Duplikasi transaksi, konflik nomor invoice, data master basi |
| **F7 — Polish** | Audit log, error handling, empty state, PDF, validasi akhir | Aksi sensitif tanpa audit, error membocorkan detail internal |

> Test case F2–F7 ditulis setelah fase sebelumnya selesai dan terverifikasi, sesuai aturan di [`docs/superpowers/plans/README.md`](../superpowers/plans/README.md).

---

## 11. Area Risiko & Fokus Pengujian

| Area | Dampak jika gagal | Fokus uji |
|---|---|---|
| **Offline & idempotensi** | Transaksi ganda/hilang | `client_id` unik, retry, batch sync, indikator pending |
| **Price snapshot** | Omzet/laporan kacau | Edit harga master, cek transaksi lama |
| **RBAC** | Kasir/operator bisa ubah data sensitif | Matriks role di setiap endpoint, bukan hanya UI |
| **Nomor invoice & antrean** | Struk ambigu, antrean bentrok | Unik per outlet/tanggal/tipe, reset harian |
| **Audit log** | Tidak ada jejak pertanggungjawaban | Void, ubah harga, absensi, gaji, user |
| **Timezone & reset harian** | Nomor/antrean salah hari | Uji sekitar tengah malam Asia/Jakarta |
| **Printer Bluetooth** | Struk tidak keluar | Koneksi, reprint, fallback browser |
| **PWA iOS** | Tidak bisa install/offline | Safari 16+, add to home screen |
| **Supabase cold start** | Query pertama lambat | Ukur warm vs cold; cache master data |
| **HP bersama & PIN** | Salah identitas/audit | Ganti operator, sesi berganti, PIN reset |
| **CSV export** | Tidak terbuka di Excel | UTF-8, separator, angka Rupiah |
| **Batas bulan gaji** | Gaji salah | Absensi akhir/awal bulan, lembur, finalize |

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
| Test case F1 | `docs/qa/test-cases/f1-fondasi.md` |
| Checklist regresi | `docs/qa/regression-checklist.md` |
| Template bug | `.github/ISSUE_TEMPLATE/bug_report.yml` |
| Template PR | `.github/pull_request_template.md` |

**Aturan repo:**

- Jangan commit langsung ke `main`.
- Branch QA: `test/nama-pengujian` atau `docs/qa/nama-dokumen`.
- Commit mengikuti Conventional Commits: `test(kasir): tambah test idempotensi`, `docs(qa): perbarui test plan F1`.
- PR wajib menjelaskan **apa yang diubah** dan **cara memverifikasi**.
- Review ke `Najwan48` atau `irgifebry`.

---

## 14. Catatan & Pertanyaan Terbuka

Temuan dokumentasi/kontrak yang perlu dikonfirmasi sebelum atau selama F1–F2. Ini bukan bug kode (kode belum ada), tetapi berpotensi menjadi bug jika tidak diputuskan.

| # | Temuan | Dampak | Rekomendasi | Status |
|---|---|---|---|---|
| 1 | **Panjang PIN berbeda**: PRD §5.1 dan §9.3 menyebut PIN 4 angka; README dan Rencana 01 mengunci minimal 6 karakter | Login/UX dan test case bisa salah | Konfirmasi ke PO; test mengikuti 6 sampai ada keputusan baru | Perlu keputusan |
| 2 | **Casing status berbeda**: PRD memakai `MENUNGGU/PROSES/SELESAI/DIBATALKAN`; schema Rencana 01 memakai default `'menunggu'` huruf kecil | Filter/laporan/status bisa tidak cocok di F2 | Kunci satu format (disarankan uppercase di API/DB) sebelum F2 | Perlu keputusan |
| 3 | **Akses `/api/settings`**: PRD §8 menyebut Pengaturan hanya Admin; Rencana 01 Task 8 membuka GET untuk semua peran dan mengembalikan tarif gaji default | Potensi kebocoran data gaji ke kasir | Filter field sensitif; atau batasi endpoint ke admin | Perlu keputusan |
| 4 | **`GET /api/users?light=1`** tidak ada di kontrak API PRD §10 | Kontrak tidak lengkap; risiko field bocor | Dokumentasikan di PRD; pastikan hanya `id,name,role` | Perlu dokumentasi |
| 5 | **Cakupan audit log**: Global Constraints mewajibkan semua endpoint sensitif; Rencana 01 hanya eksplisit untuk user | Perubahan harga/pajak/bank bisa tanpa jejak | Tentukan daftar aksi yang diaudit di F1/F2 | Perlu keputusan |
| 6 | **Password admin seed** `admin123` | Risiko keamanan jika dipakai di production | Wajib ganti setelah seed di environment non-local | Mitigasi |
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
