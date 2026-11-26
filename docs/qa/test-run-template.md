# Test Run Report — [Nama Run]

| | |
|---|---|
| **Tanggal eksekusi** | dd/mm/yyyy, hh:mm WIB |
| **Commit** | `<hash>` |
| **Environment** | Local / Vercel Preview / Production — URL backend |
| **Database** | Nama database / PGlite |
| **Eksekutor** | Nama (QA) |
| **Jenis pengujian** | Smoke / API E2E / Mobile E2E / Regresi / UAT |
| **Hasil** | **X/Y PASS, Z FAIL** |
| **Test case terkait** | [`F2 — Kasir Inti`](./test-cases/f2-kasir-inti.md) |

> Satu laporan = satu run pada satu commit/environment. Jangan mencampur hasil dari beberapa build.

---

## 1. Ringkasan

| Area | Jumlah check | Lulus | Gagal |
|---|---:|---:|---:|
| Auth & sesi |  |  |  |
| Master data |  |  |  |
| Order & antrean |  |  |  |
| Pembayaran |  |  |  |
| Laporan & export |  |  |  |
| Mobile UI |  |  |  |
| **Total** |  |  |  |

Kesimpulan singkat: apakah ada bug S1/S2, apakah scope aman untuk lanjut.

---

## 2. Data Uji

| Tipe | Nama/ID | Nilai |
|---|---|---|
| Akun |  |  |
| Paket |  |  |
| Add-on |  |  |
| Bank |  |  |
| Order |  |  |

Catat apakah data uji dibersihkan atau ditinggalkan, dan di database mana.

---

## 3. Hasil per Check

| ID | Check | Hasil | Bukti ringkas |
|---|---|---|---|
|  |  | PASS/FAIL/BLOCKED | status code, body, screenshot, log |
|  |  |  |  |

Untuk FAIL, wajib menyertakan:
- langkah reproduksi;
- expected vs actual;
- environment/device;
- tautan issue bug.

---

## 4. Temuan & Observasi

### 4.1 Defect

| Severity | Deskripsi | Issue | Status |
|---|---|---|---|
| S1/S2/S3/S4 |  |  |  |

### 4.2 Observasi non-defect

- Perbedaan kontrak/dokumentasi.
- Perilaku yang perlu keputusan produk.
- Data/angka yang tidak bisa dijadikan baseline.

---

## 5. Kesimpulan

- Scope yang dinyatakan lulus.
- Scope yang belum dieksekusi.
- Apakah layak lanjut ke fase berikutnya / sign-off rilis.
- Rekomendasi berikutnya.

---

## 6. Sign-off

| Peran | Nama | Tanggal | Hasil |
|---|---|---|---|
| QA |  |  |  |
| Developer |  |  |  |
| PO / pemilik outlet |  |  |  |

---

## 7. Lampiran

- Screenshot/video:
- Log/JSON hasil:
- File export:
- Issue terkait:
