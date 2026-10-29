"use client";

import { useEffect, useState } from "react";
import { Banknote, Clock3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { rupiah } from "@/lib/format";

type CashSession = {
  openedAt: string;
  openingAmount: number;
  closedAt?: string;
  closingAmount?: number;
  note: string;
};

function timestamp() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

export default function GajiKasPage() {
  const [dailyRate, setDailyRate] = useState("");
  const [salaryMessage, setSalaryMessage] = useState("");

  // Persist dailyRate across refreshes
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gaji-kas:dailyRate");
      if (saved) setDailyRate(saved);
    } catch { /* ignore */ }
  }, []);

  function saveDailyRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      localStorage.setItem("gaji-kas:dailyRate", dailyRate);
      setSalaryMessage("Tersimpan di perangkat ini.");
    } catch {
      setSalaryMessage("Gagal menyimpan. Storage penuh?");
    }
  }
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [note, setNote] = useState("");
  const [session, setSession] = useState<CashSession | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [cashMessage, setCashMessage] = useState("");

  function openCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(openingAmount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setCashMessage("Masukkan saldo awal berupa angka bulat, minimal Rp0.");
      return;
    }
    setSession({ openedAt: timestamp(), openingAmount: amount, note: note.trim() });
    setHistory((items) => [{ openedAt: timestamp(), openingAmount: amount, note: note.trim() }, ...items]);
    setOpeningAmount("");
    setNote("");
    setCashMessage("Sesi kas tercatat di halaman ini saja; belum tersambung ke penyimpanan.");
  }

  function closeCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(closingAmount);
    if (!Number.isSafeInteger(amount) || amount < 0 || !session) {
      setCashMessage("Masukkan jumlah kas akhir berupa angka bulat, minimal Rp0.");
      return;
    }
    const closed = { ...session, closedAt: timestamp(), closingAmount: amount };
    setHistory((items) => [closed, ...items.filter((item) => item.openedAt !== session.openedAt)]);
    setSession(null);
    setClosingAmount("");
    setCashMessage("Penutupan tercatat di halaman ini saja; belum tersambung ke penyimpanan.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Gaji &amp; Kas</h1>
        <p className="mt-1 text-muted">Atur acuan gaji harian dan catat pergantian kas.</p>
      </div>

      <p className="rounded-xl border border-amber-200 bg-accent-soft p-3 text-sm text-amber-900">
        Gaji default tersimpan di perangkat ini. Riwayat kas hanya tersimpan sementara selama halaman terbuka; belum terhubung ke server.
      </p>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Banknote className="h-5 w-5" /></div>
          <div><CardTitle>Pengaturan gaji</CardTitle><p className="text-sm text-muted">Acuan gaji harian untuk karyawan baru.</p></div>
        </div>
        <form className="flex flex-col gap-4" onSubmit={saveDailyRate}>
          <Field label="Gaji harian default (Rp)">
            <Input type="number" min="0" step="1" inputMode="numeric" value={dailyRate} onChange={(event) => { setDailyRate(event.target.value); setSalaryMessage(""); }} placeholder="Masukkan nominal" />
          </Field>
          <p className="text-sm text-muted">Tarif gaji tiap karyawan tetap diatur pada data karyawan.</p>
          {salaryMessage && <p role="status" className="text-sm text-muted">{salaryMessage}</p>}
          <Button type="submit" fullWidth>Simpan ke perangkat ini</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success"><Wallet className="h-5 w-5" /></div>
          <div><CardTitle>{session ? "Kas sedang buka" : "Buka kas"}</CardTitle><p className="text-sm text-muted">{session ? `Dibuka ${session.openedAt}` : "Catat saldo awal sebelum mulai transaksi."}</p></div>
        </div>
        {session ? (
          <form className="flex flex-col gap-4" onSubmit={closeCash}>
            <div className="rounded-xl bg-bg p-3 text-sm"><span className="text-muted">Saldo awal tercatat</span><p className="font-semibold text-ink">{rupiah(session.openingAmount)}</p></div>
            <Field label="Kas akhir terhitung (Rp)"><Input type="number" min="0" step="1" inputMode="numeric" value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} placeholder="Masukkan jumlah kas fisik" /></Field>
            <p className="text-sm text-muted">Belum ada data penjualan tunai untuk menghitung saldo yang seharusnya.</p>
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
          <div><CardTitle>Riwayat kas</CardTitle><p className="text-sm text-muted">Catatan lokal selama halaman ini terbuka.</p></div>
        </div>
        {history.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Belum ada sesi kas tercatat.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {history.map((item) => <li key={item.openedAt} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">{item.closedAt ? "Kas ditutup" : "Kas masih terbuka"}</span>
                <span className="text-xs text-muted">{item.closedAt ?? item.openedAt}</span>
              </div>
              <p className="mt-1 text-sm text-muted">Saldo awal: {rupiah(item.openingAmount)}{item.closingAmount !== undefined ? ` · Kas akhir: ${rupiah(item.closingAmount)}` : ""}</p>
              {item.note && <p className="text-sm text-muted">{item.note}</p>}
            </li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
