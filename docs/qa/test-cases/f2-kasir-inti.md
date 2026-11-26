# Test Case — F2 Kasir Inti

| | |
|---|---|
| **Fase** | F2 — Kasir Inti |
| **Sumber** | `prd.md` §4–§11, [`docs/backend/README.md`](../../backend/README.md) §6.2, [`mobile/src/screens`](../../../mobile/src/screens) |
| **Status implementasi** | Backend dan mobile sudah berjalan; eksekusi QA sedang berlangsung |
| **Eksekutor** | QA |
| **Environment** | Local (`http://localhost:3001` + Expo Web `http://localhost:8081`) / Vercel Preview |

## Cara Pakai

- Jalankan berurutan per modul. Siapkan data uji dengan prefix `QA -` lewat API atau Pengaturan mobile.
- Status yang dipakai: `Belum`, `Sedang`, `Lulus (API)`, `Lulus (manual)`, `Gagal`, `Blocked`, `N/A`.
- `Lulus (API 26/11)` berarti sudah diverifikasi pada [test run P0 API 26/11/2026](../test-runs/2026-11-26-p0-api.md).
- `Lulus (API 26/11, sebagian)` berarti alur utama sudah diverifikasi, tetapi sub-assertion yang tertulis (mis. timestamp, pajak, isi sheet) belum dieksekusi dan tetap wajib diuji.
- Setiap `Gagal` wajib punya issue bug dan mencantumkan ID test case ini.
- Untuk kasus API, lampirkan status code + body response. Untuk mobile, lampirkan screenshot/video dan device/browser.
- Jangan memakai data production untuk pengujian destruktif.

> **Kontrak yang berlaku saat ini:** role hanya `admin`; status order `menunggu` → `proses` → `selesai` → `paid`, atau `dibatalkan`. Pembayaran boleh dicatat saat `menunggu`/`proses`/`selesai`; status baru menjadi `paid` saat order mencapai `selesai`. Order total 0 langsung `proses` dari mobile tanpa modal pembayaran.

---

## Smoke Test (Wajib Sebelum Rilis)

| ID | P | Tipe | Skenario | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-001 | P0 | A | Buat order motor dengan paket aktif dan tanpa add-on. | `201`; status `menunggu`; `queueNo` `M-###`; `invoiceNo` `S-YYYYMMDD-###`; total sesuai harga paket. | Lulus (API 26/11) |
| F2-002 | P0 | A | Buat order mobil dengan paket mobil aktif. | `201`; status `menunggu`; `queueNo` `C-###`; total sesuai harga paket. | Lulus (API 26/11, sebagian — run memakai add-on) |
| F2-003 | P0 | A | Bayar tunai saat status `menunggu`, uang diterima lebih dari total. | `201`; `payment.method=tunai`; `amount=grandTotal`; `tender` dan `changeAmount` benar; status tetap `menunggu`. | Lulus (API 26/11) |
| F2-004 | P0 | A | Bayar transfer dengan bank aktif dan nomor referensi. | `201`; `payment.method=transfer`; `bank` berformat `Nama Bank - Nomor`; referensi tersimpan; status tetap `menunggu`. | Lulus (API 26/11) |
| F2-005 | P0 | A | Ubah status `menunggu` → `proses` → `selesai` pada order yang sudah dibayar. | `200`; status akhir `paid`; `startedAt` dan `finishedAt` terisi. | Lulus (API 26/11, sebagian — timestamp belum) |
| F2-006 | P0 | A | Kirim dua kali order dengan `clientId` yang sama. | Kedua request menghasilkan order ID dan invoice yang sama; tidak ada order ganda. | Lulus (API 26/11) |
| F2-007 | P0 | A | Buat order ROYALTY paket Reguler tanpa add-on (total 0), lalu ubah ke `proses`. | `grandTotal=0`, `discount` tercatat; `PATCH status=proses` berhasil tanpa pembayaran. | Lulus (API 26/11) |
| F2-008 | P0 | M | Alur mobile: login → Kasir buat antrean → Antrean Mulai Cuci + bayar → Selesai → bagikan struk. | Seluruh langkah berhasil; status berubah sesuai alur; struk berisi invoice, antrean, paket, plat, dan total. | Belum |

---

## Modul 1 — Master Data & Snapshot Harga

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-010 | P0 | A | Buat paket dengan `royaltyPrice` dan `ojolPrice`; lalu `GET /api/packages`. | `201`; kedua harga tersimpan dan terbaca kembali; `null` tetap `null`. | Lulus (API 26/11) |
| F2-011 | P0 | A | Buat paket dengan nama + tipe kendaraan yang sudah ada. | `409 DUPLICATE`; data lama tidak berubah. | Belum |
| F2-012 | P0 | A | Buat order, lalu ubah harga paket lewat `PATCH /api/packages/:id`; buka detail order lama. | `priceSnapshot` order lama tidak berubah; order baru memakai harga baru. | Belum |
| F2-013 | P0 | A | Nonaktifkan paket (`DELETE`), lalu coba buat order dengan paket tersebut. | Paket tidak muncul di daftar aktif; pembuatan order ditolak `400 VALIDATION_ERROR`. | Belum |
| F2-014 | P1 | A | Buat add-on hanya untuk `motor`, lalu coba pakai di order `mobil`. | Order ditolak `400 VALIDATION_ERROR`; add-on tetap tampil untuk motor. | Belum |
| F2-015 | P1 | A | Nonaktifkan bank, lalu coba bayar transfer memakai bank tersebut. | Pembayaran ditolak `400 VALIDATION_ERROR`; bank tidak muncul di pilihan aktif. | Belum |

---

## Modul 2 — Pembuatan Order, Antrean, dan Invoice

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-020 | P0 | A | Buat order dengan add-on `qty=2`. | Subtotal add-on = harga × 2; `total` dan `grandTotal` benar; item tersimpan. | Belum |
| F2-021 | P0 | A | Buat order dengan `vehicleName="  Honda Beat  "` dan `plate=" b 1234 abc "`. | `vehicleName` tersimpan ke `vehicles.brand`; plat di-trim dan uppercase menjadi `B 1234 ABC`. | Belum |
| F2-022 | P0 | A | Buat order `mobil` memakai `packageId` milik `motor`. | `400 VALIDATION_ERROR`; tidak ada order/antrean baru. | Belum |
| F2-023 | P0 | A | Buat order memakai add-on yang sudah nonaktif. | `400 VALIDATION_ERROR`; tidak ada order baru. | Belum |
| F2-024 | P0 | A | Buat order dengan `qty` add-on `0` dan `100`. | Keduanya ditolak `400 VALIDATION_ERROR` (batas 1–99). | Belum |
| F2-025 | P0 | A | Buat order tanpa `packageId` atau dengan ID yang tidak ada. | `400 VALIDATION_ERROR`; tidak ada order baru. | Belum |
| F2-026 | P0 | A | Buat dua order dengan `clientId` berbeda. | Dua order berbeda dibuat; antrean dan invoice bertambah. | Lulus (API 26/11, sebagian — clientId eksplisit belum) |
| F2-027 | P1 | A | `GET /api/orders?from=...&to=...&includePaid=false` dan `GET /api/board`. | Filter tanggal bekerja; board hanya memuat order aktif; `summary` menghitung menunggu/proses/selesai/total/cancelled dengan benar. | Lulus (API 26/11, sebagian — hanya board) |
| F2-028 | P1 | A | Buat beberapa order motor dan mobil pada hari yang sama. | Urutan antrean per tipe kendaraan berurutan (`M-001`, `M-002`, `C-001`, ...); invoice berurutan per hari. | Belum |

---

## Modul 3 — Harga ROYALTY, OJOL, Diskon, dan Pajak

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-030 | P0 | A | Order normal paket + add-on. | `total = harga paket + harga add-on`; `discount=0`; `grandTotal=total+pajak`. | Lulus (API 26/11, sebagian — pajak 0) |
| F2-031 | P0 | A | Order ROYALTY memakai paket yang namanya mengandung `Reguler`. | Harga paket efektif `0`; add-on tetap bayar penuh; `discount = harga normal paket`. | Lulus (API 26/11) |
| F2-032 | P0 | A | Order ROYALTY memakai paket Komplit dengan `royaltyPrice` terisi. | Harga paket efektif = `royaltyPrice`; `discount = price - royaltyPrice`. | Lulus (API 26/11) |
| F2-033 | P0 | A | Order ROYALTY dengan add-on. | Add-on tetap harga normal, tidak ikut diskon; subtotal add-on benar. | Lulus (API 26/11) |
| F2-034 | P0 | A | Order OJOL memakai paket dengan `ojolPrice` terisi. | Harga paket efektif = `ojolPrice`; `discount` = selisih harga normal; add-on penuh. | Lulus (API 26/11) |
| F2-035 | P1 | A | Order OJOL memakai paket dengan `ojolPrice=null`. | Harga paket fallback ke harga normal; tidak ada diskon OJOL. | Belum |
| F2-036 | P0 | A | Kirim `royalty=true` dan `ojol=true` pada order yang sama. | ROYALTY menang; harga memakai aturan ROYALTY, bukan OJOL; label/diskon konsisten. | Belum |
| F2-037 | P1 | A | Set pajak outlet 10%, buat order dengan diskon ROYALTY/OJOL. | Pajak dihitung dari subtotal setelah diskon; pembulatan konsisten; `grandTotal` benar. | Belum |
| F2-038 | P1 | A | Ubah harga paket setelah order dibuat, lalu buka laporan/struk order lama. | Nilai transaksi lama tetap memakai `priceSnapshot`; laporan tidak berubah. | Belum |

---

## Modul 4 — Pembayaran

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-040 | P0 | A | Bayar tunai tepat sejumlah total dan lebih bayar. | `201`; `amount=grandTotal`; `changeAmount=0` saat pas; kembalian benar saat lebih bayar. | Lulus (API 26/11, sebagian — uang pas belum) |
| F2-041 | P0 | A | Bayar tunai kurang dari total. | `400 VALIDATION_ERROR`; tidak ada payment tersimpan; status order tidak berubah. | Lulus (API 26/11) |
| F2-042 | P0 | A | Bayar transfer tanpa `bankId`. | `400 VALIDATION_ERROR` dengan pesan bank wajib dipilih. | Belum |
| F2-043 | P0 | A | Bayar transfer tanpa `referenceNo`. | `400 VALIDATION_ERROR` dengan pesan nomor referensi wajib diisi. | Belum |
| F2-044 | P0 | A | Bayar transfer dengan bank aktif + referensi valid. | `201`; payment tersimpan; status belum berubah menjadi `paid` jika order belum selesai. | Lulus (API 26/11) |
| F2-045 | P0 | A | Bayar saat order masih `menunggu`, lalu ubah ke `proses`. | Status setelah bayar tetap `menunggu`; setelah `PATCH proses` menjadi `proses`. | Lulus (API 26/11) |
| F2-046 | P0 | A | Bayar saat order sudah `proses`, lalu selesaikan. | Status setelah bayar tetap `proses`; setelah `selesai` menjadi `paid`. | Lulus (API 26/11) |
| F2-047 | P0 | A | Bayar saat order sudah `selesai` (belum pernah bayar). | `201`; status langsung menjadi `paid`. | Belum |
| F2-048 | P0 | A | Kirim pembayaran kedua untuk order yang sudah punya payment. | `409 ALREADY_PAID`; payment lama tidak berubah. | Lulus (API 26/11) |
| F2-049 | P0 | A | Bayar order yang sudah `dibatalkan`. | `409 INVALID_STATUS`; tidak ada payment tersimpan. | Lulus (API 26/11) |

---

## Modul 5 — Status dan Pembatalan

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-050 | P0 | A | `PATCH status=proses` pada order `menunggu`. | `200`; status `proses`; `startedAt` terisi. | Lulus (API 26/11, sebagian — timestamp belum) |
| F2-051 | P0 | A | `PATCH status=selesai` pada order `proses` yang sudah dibayar. | `200`; status `paid`; `finishedAt` terisi. | Lulus (API 26/11, sebagian — timestamp belum) |
| F2-052 | P0 | A | `PATCH status=selesai` langsung dari `menunggu`. | `409 INVALID_STATUS`; status tidak berubah. | Lulus (API 26/11) |
| F2-053 | P0 | A | `PATCH status=proses` dua kali berturut-turut. | Request kedua `409 INVALID_STATUS`; data tidak berubah. | Lulus (API 26/11) |
| F2-054 | P0 | A | Batalkan order `menunggu`/`proses` dengan alasan minimal 3 karakter. | `200`; status `dibatalkan`; `cancelledReason` tersimpan; order hilang dari board aktif. | Lulus (API 26/11, sebagian — board belum) |
| F2-055 | P0 | A | Batalkan order yang sudah `paid`. | `409 INVALID_STATUS`; status tetap `paid`. | Belum |
| F2-056 | P1 | A | Batalkan order dengan alasan kurang dari 3 karakter. | `400 VALIDATION_ERROR`; status tidak berubah. | Belum |
| F2-057 | P1 | A | Setelah `paid`/`dibatalkan`, coba ubah status atau item. | Semua perubahan ditolak `409 INVALID_STATUS`. | Belum |

---

## Modul 6 — Struk Publik

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-060 | P0 | A | `GET /api/receipts/:token` memakai UUID order tanpa cookie/sesi. | `200`; struk bisa diakses publik; tidak ada data user sensitif. | Lulus (API 26/11) |
| F2-061 | P0 | A | Panggil struk dengan UUID yang tidak ada dan string bukan UUID. | Keduanya `404 NOT_FOUND`. | Belum |
| F2-062 | P1 | A | Periksa isi struk setelah order dibayar. | Invoice, antrean, paket, add-on, plat, total, payment, dan data outlet benar. | Lulus (API 26/11, sebagian) |
| F2-063 | P1 | M | Bagikan struk dari mobile setelah membuat antrean. | Teks struk berisi invoice, antrean, paket, plat, dan total; share sheet terbuka. | Belum |

---

## Modul 7 — Dashboard, Laporan, dan Export

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-070 | P0 | A | `GET /api/reports/transactions?from=...&to=...` setelah beberapa order dibayar. | Hanya order `paid` yang muncul; order `selesai` tanpa payment tidak muncul. | Lulus (API 26/11, sebagian — exclusion belum) |
| F2-071 | P1 | A | `GET /api/reports/omzet?from=...&to=...&groupBy=day` (ulangi untuk `week` dan `month`). | Total revenue, count, cash, dan transfer sesuai rentang; grouping benar. | Belum |
| F2-072 | P1 | A | `GET /api/reports/paket?from=...&to=...`. | Agregasi jumlah dan total per paket benar; paket tanpa transaksi tidak muncul. | Belum |
| F2-073 | P1 | A | `GET /api/reports/addon?from=...&to=...`. | Qty, jumlah, dan total per add-on benar. | Belum |
| F2-074 | P1 | A | `GET /api/reports/payment-method?from=...&to=...`. | Total tunai dan transfer sesuai payment yang tersimpan. | Belum |
| F2-075 | P0 | A | `GET /api/reports/export.csv?from=...&to=...&type=transactions`. | `200`; file CSV valid; header dan baris transaksi sesuai; karakter Rupiah aman di Excel. | Lulus (API 26/11, sebagian — isi & Excel belum) |
| F2-076 | P0 | A | `GET /api/reports/export.xlsx?from=...&to=...&type=transactions`. | `200`; file `.xlsx` valid; 6 sheet (Ringkasan, Transaksi, Paket, Add-on, Metode Pembayaran, Kas); formula TOTAL ada. | Lulus (API 26/11, sebagian — sheet & formula belum) |
| F2-077 | P1 | A | `GET /api/dashboard/today`. | Omzet, transaksi, tiket rata-rata, tunai/transfer, motor/mobil sesuai data hari ini. | Lulus (API 26/11, sebagian — nilai agregat belum) |

---

## Modul 8 — Mobile E2E (Expo)

| ID | P | Tipe | Skenario & langkah | Hasil yang diharapkan | Status |
|---|---|---|---|---|---|
| F2-080 | P0 | M | Login `admin@pos.test` / `123456`, lalu reload aplikasi. | Login berhasil; sesi tersimpan; tidak kembali ke layar login setelah reload. | Belum |
| F2-081 | P0 | M | Periksa tampilan setelah login. | Tema terang; tepat 4 tab: Kasir, Antrean, Laporan, Pengaturan; tidak ada dark mode. | Belum |
| F2-082 | P0 | M | Di Kasir, pilih Motor/Mobil lalu pilih paket dan add-on. | Paket/add-on yang tampil sesuai tipe kendaraan; total berubah benar saat qty/checkbox diubah. | Belum |
| F2-083 | P0 | M | Aktifkan toggle ROYALTY dan OJOL di Kasir. | Harga dan total berubah sesuai aturan; ROYALTY menang jika keduanya aktif; add-on tetap penuh. | Belum |
| F2-084 | P0 | M | Isi Nama Kendaraan + plat, tekan **Buat antrean**. | Order dibuat `menunggu`; modal struk terang tampil; invoice/antrean benar; tombol bagikan bekerja. | Belum |
| F2-085 | P0 | M | Di Antrean, coba tab status dan filter kendaraan. | Filter Semua/Menunggu/Proses/Selesai/Dibatalkan dan Semua/Motor/Mobil bekerja; hitungan sesuai. | Belum |
| F2-086 | P0 | M | Tekan **Mulai Cuci** pada order `menunggu` bertotal > 0. | Modal pembayaran muncul; setelah bayar, status menjadi `proses`. | Belum |
| F2-087 | P0 | M | Tekan **Mulai Cuci** pada order total 0. | Modal pembayaran tidak muncul; status langsung `proses`. | Belum |
| F2-088 | P0 | M | Selesaikan dan batalkan order dari Antrean. | Selesai mengubah status; batal meminta alasan; daftar dan ringkasan langsung diperbarui. | Belum |
| F2-089 | P1 | M | Di Laporan, ketuk kartu Total Omzet beberapa kali. | Periode berganti Hari Ini → Minggu Ini → Bulan Ini → Hari Ini; angka dan judul ikut berubah. | Belum |
| F2-090 | P1 | M | Di Laporan, tekan **Export Excel**, pilih rentang tanggal. | File `.xlsx` terunduh; popup nama file + lokasi tampil; tombol Buka/Bagikan bekerja sesuai platform. | Belum |
| F2-091 | P1 | M | Di Pengaturan, tambah/edit/hapus paket, add-on, bank, serta tambah/edit/nonaktifkan pengguna. | Data tersimpan; daftar hanya record aktif; aksi Hapus memakai konfirmasi dan data hilang dari daftar. | Belum |
| F2-092 | P1 | M | Restart aplikasi dan buka kembali. | Sesi tetap aktif; data terbaru termuat; tidak ada error putih/blank screen. | Belum |

---

## Catatan Eksekusi

- Test run API P0 26/11/2026 mencakup 25 check dan semuanya lulus. Lihat [laporan test run](../test-runs/2026-11-26-p0-api.md).
- Status `Lulus (API 26/11, sebagian)` berarti alur utama lulus, tetapi sub-assertion yang tertulis **belum** dieksekusi dan tidak dihitung sebagai cakupan selesai.
- Kasus mobile di modul 8 **belum** dieksekusi otomatis; perlu pengujian manual di Expo Web/Expo Go.
- Kasus negatif yang masih `Belum` (validasi paket/add-on/bank, snapshot harga, pembayaran setelah `selesai`, pembatalan `paid`, struk invalid, laporan agregasi) menjadi prioritas run berikutnya.
- Beberapa kasus bergantung pada keputusan produk yang masih terbuka: status `paid` untuk order gratis, pembulatan pajak, dan format error auth. Lihat [`test-plan.md`](../test-plan.md) §14.
- Data uji P0 memakai prefix `QA P0` dan tetap tersimpan di database lokal agar bisa direproduksi. Gunakan database QA terpisah untuk run regresi yang bersih.
