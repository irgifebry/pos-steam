"use client";

import { useEffect, useState } from "react";
import { Banknote, Clock3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api-client";
import { rupiah } from "@/lib/format";

type CashShift = {
  id: string;
  date: string;
  openedByName: string;
  openingCash: number;
  closedByName: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  note: string;
  openedAt: string;
  closedAt: string | null;
};

type CashState = {
  open: CashShift | null;
  history: CashShift[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function GajiKasPage() {
  const [dailyRate, setDailyRate] = useState("");
  const [salaryMessage, setSalaryMessage] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [note, setNote] = useState("");
  const [cash, setCash] = useState<CashState>({ open: null, history: [] });
  const [cashMessage, setCashMessage] = useState("");
  const [cashLoading, setCashLoading] = useState(true);

  async function loadSettings() {
    try {
      const res = await apiFetch<{ data: { defaultDailyRate: number } }>("/api/settings");
      setDailyRate(String(res.data.defaultDailyRate || ""));
    } catch (e) {
      setSalaryMessage(e instanceof Error ? e.message : "Gagal memuat pengaturan gaji");
    } finally {
      setLoadingSettings(false);
    }
  }

  async function loadCash() {
    try {
      const res = await apiFetch<{ data: CashState }>("/api/cash-shifts");
      setCash(res.data);
    } catch (e) {
      setCashMessage(e instanceof Error ? e.message : "Gagal memuat data kas");
    } finally {
      setCashLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    void loadCash();
  }, []);

  async function saveDailyRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalaryMessage("");
    const amount = Number(dailyRate);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setSalaryMessage("Masukkan gaji harian berupa angka bulat, minimal Rp0.");
      return;
    }
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultDailyRate: amount }),
      });
      setSalaryMessage("Gaji harian default tersimpan.");
    } catch (e) {
      setSalaryMessage(e instanceof Error ? e.message : "Gagal menyimpan gaji harian");
    }
  }

  async function openCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCashMessage("");
    const amount = Number(openingAmount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setCashMessage("Masukkan saldo awal berupa angka bulat, minimal Rp0.");
      return;
    }
    try {
      const res = await apiFetch<{ data: CashState }>("/api/cash-shifts", {
        method: "POST",
        body: JSON.stringify({ openingCash: amount, note: note.trim() }),
      });
      setCash(res.data);
      setOpeningAmount("");
      setNote("");
      setCashMessage("Shift kas dibuka.");
    } catch (e) {
      setCashMessage(e instanceof Error ? e.message : "Gagal membuka kas");
    }
  }

  async function closeCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCashMessage("");
    if (!cash.open) return;
    const amount = Number(closingAmount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setCashMessage("Masukkan jumlah kas akhir berupa angka bulat, minimal Rp0.");
      return;
    }
    try {
      const res = await apiFetch<{ data: CashState }>(`/api/cash-shifts/${cash.open.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingCash: amount }),
      });
      setCash(res.data);
      setClosingAmount("");
      setCashMessage("Shift kas ditutup.");
    } catch (e) {
      setCashMessage(e instanceof Error ? e.message : "Gagal menutup kas");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Gaji &amp; Kas</h1>
        <p className="mt-1 text-muted">Atur acuan gaji harian dan catat pergantian kas.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Banknote className="h-5 w-5" /></div>
          <div><CardTitle>Pengaturan gaji</CardTitle><p className="text-sm text-muted">Acuan gaji harian untuk karyawan baru.</p></div>
        </div>
        <form className="flex flex-col gap-4" onSubmit={saveDailyRate}>
          <Field label="Gaji harian default (Rp)">
            <Input type="number" min="0" step="1" inputMode="numeric" value={dailyRate} onChange={(event) => { setDailyRate(event.target.value); setSalaryMessage(""); }} placeholder="Masukkan nominal" disabled={loadingSettings} />
          </Field>
          <p className="text-sm text-muted">Tarif gaji tiap karyawan tetap diatur pada data karyawan.</p>
          {salaryMessage && <p role="status" className="text-sm text-muted">{salaryMessage}</p>}
          <Button type="submit" fullWidth disabled={loadingSettings}>Simpan gaji harian</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success"><Wallet className="h-5 w-5" /></div>
          <div>
            <CardTitle>{cash.open ? "Kas sedang buka" : "Buka kas"}</CardTitle>
            <p className="text-sm text-muted">
              {cash.open ? `Dibuka ${formatDateTime(cash.open.openedAt)} oleh ${cash.open.openedByName}` : "Catat saldo awal sebelum mulai transaksi."}
            </p>
          </div>
        </div>
        {cash.open ? (
          <form className="flex flex-col gap-4" onSubmit={closeCash}>
            <div className="rounded-xl bg-bg p-3 text-sm">
              <span className="text-muted">Saldo awal tercatat</span>
              <p className="font-semibold text-ink">{rupiah(cash.open.openingCash)}</p>
            </div>
            <Field label="Kas akhir terhitung (Rp)"><Input type="number" min="0" step="1" inputMode="numeric" value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} placeholder="Masukkan jumlah kas fisik" /></Field>
            <p className="text-sm text-muted">Kas seharusnya dihitung server dari saldo awal ditambah pembayaran tunai sejak shift dibuka.</p>
            <Button type="submit" fullWidth>Tutup kas</Button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={openCash}>
            <Field label="Saldo awal (Rp)"><Input type="number" min="0" step="1" inputMode="numeric" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="Masukkan saldo awal" /></Field>
            <Field label="Catatan (opsional)"><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contoh: pergantian shift pagi" /></Field>
            <Button type="submit" fullWidth>Buka kas</Button>
          </form>
        )}
        {cashMessage && <p role="status" className="mt-3 text-sm text-muted">{cashMessage}</p>}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info"><Clock3 className="h-5 w-5" /></div>
          <div><CardTitle>Riwayat kas</CardTitle><p className="text-sm text-muted">Tersimpan di server outlet.</p></div>
        </div>
        {cashLoading ? (
          <p className="py-4 text-center text-sm text-muted">Memuat riwayat kas...</p>
        ) : cash.history.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Belum ada sesi kas tercatat.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {cash.history.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{item.closedAt ? "Kas ditutup" : "Kas masih terbuka"}</span>
                  <span className="text-xs text-muted">{item.closedAt ? formatDateTime(item.closedAt) : formatDateTime(item.openedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Saldo awal: {rupiah(item.openingCash)}
                  {item.closingCash !== null ? ` · Kas akhir: ${rupiah(item.closingCash)}` : ""}
                  {item.expectedCash !== null ? ` · Seharusnya: ${rupiah(item.expectedCash)}` : ""}
                  {item.difference !== null ? ` · Selisih: ${rupiah(item.difference)}` : ""}
                </p>
                {item.note && <p className="text-sm text-muted">{item.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
