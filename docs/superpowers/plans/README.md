# Peta Rencana Implementasi

> **Catatan (21 November 2026):** Dokumen rencana fase di folder ini adalah **arsip historis** yang merekam proses perencanaan awal dan **tidak menggambarkan perilaku aplikasi yang saat ini dikirim**. Untuk perilaku terkini, rujuk `README.md` di root repo, bagian *Catatan Implementasi Saat Ini* di [`../../prd.md`](../../prd.md), dan `docs/backend/README.md`. Rencana lama sengaja dibiarkan apa adanya sebagai catatan sejarah dan tidak diperbarui.

PRD (`../../prd.md`) dibagi menjadi 7 rencana terpisah. Setiap rencana menghasilkan perangkat lunak yang bisa diuji dan dijalankan sendiri, dan bisa dikerjakan berurutan.

| # | Rencana | Cakupan | Output yang bisa diuji |
|---|---|---|---|
| 01 | `2026-10-20-01-fondasi.md` | Next.js App Router, skema Drizzle + Supabase, Better Auth (Google + PIN), master data (paket, add-on, outlet, bank, pengguna), shell 5-tab, PWA, seed | Login berhasil, master data bisa CRUD, aplikasi bisa di-install di HP |
| 02 | `2026-10-20-02-kasir-inti.md` *(belum ditulis)* | Alur transaksi: pilih paket/add-on, data pelanggan + plat, antrean, pembayaran tunai/transfer, struk cetak + digital, buka/tutup kas | Satu transaksi motor selesai ≤ 30 detik, struk tercetak |
| 03 | `2026-10-20-03-papan-status.md` *(belum ditulis)* | Papan antrean, timer, filter tipe, layar tampil untuk pelanggan | Status berubah ≤ 1 detik, timer akurat |
| 04 | `2026-10-20-04-laporan-omzet.md` *(belum ditulis)* | Dashboard omzet, 6 laporan, export CSV, cetak | Omzet rekonsiliasi 100% dengan jumlah transaksi |
| 05 | `2026-10-20-05-absensi-gaji.md` *(belum ditulis)* | Absensi harian, rekap bulanan, hitung gaji, slip PDF | Gaji bulan X = rekap absensi bulan X |
| 06 | `2026-10-20-06-offline.md` *(belum ditulis)* | Cache master data, antrean IndexedDB, sinkron idempotent, indikator pending | Kasir tetap bisa jualan tanpa internet, tanpa duplikasi |
| 07 | `2026-10-20-07-polish.md` *(belum ditulis)* | Audit log, PDF struk, validasi, empty state, error handling | Semua aksi sensitif punya jejak audit |

## Aturan
- Rencana berikutnya ditulis **setelah** rencana sebelumnya selesai dan terverifikasi, agar tidak ada asumsi tentang kode yang belum ada.
- Semua rencana mengacu pada `prd.md` sebagai spesifikasi. Bila PRD berubah, rencana yang relevan harus diperbarui lebih dulu.
- Setiap rencana punya bagian **Global Constraints** dan **Review Focus** sendiri; constraint itu berlaku kumulatif lintas rencana.

## Ketentuan yang sudah dikunci di Rencana 01 (berlaku untuk semua rencana berikutnya)

- **Paket/add-on terikat `vehicle_type`** — filter dan validasi konsisten di service layer, bukan hanya di UI.
- **Harga master boleh berubah; harga transaksi tidak.** `order_items.price_snapshot` adalah nilai final saat transaksi.
- **PIN = password** (minimal 6 karakter, `minPasswordLength: 6` Better Auth). Ganti operator = `signIn.email` dengan email + PIN, sesi berganti.
- **Otorisasi hanya di Route Handler.** Halaman adalah static shell; ini yang membuat PWA bisa jalan offline.
- **Semuanya lewat Route Handler di `src/app/api/**`**, service layer di `src/lib/services/` menerima `db` sebagai argumen.
- **Nomor invoice** `S-YYYYMMDD-NNN` dan **nomor antrean** `M-001`/`C-001` per tipe, reset harian.
- **Pajak default 0%**, configurable per outlet.
- **Struk digital** di `/r/{token}` publik, dikirim via `navigator.share` ke WhatsApp.
