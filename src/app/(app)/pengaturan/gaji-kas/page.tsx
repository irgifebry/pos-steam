"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Clock3, Wallet } from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api-client";
import { rupiah } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

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
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [note, setNote] = useState("");
  const [cash, setCash] = useState<CashState | null>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  const { role, isLoading } = useAppSession();

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: { defaultDailyRate: number } | null }>("/api/settings");
      setDailyRate(String(res?.data?.defaultDailyRate ?? ""));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal memuat pengaturan gaji");
    } finally {
      setLoadingSettings(false);
    }
  }, [showToast]);

  const loadCash = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: CashState | null }>("/api/cash-shifts");
      setCash(res?.data ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal memuat data kas");
    } finally {
      setCashLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isLoading || role !== "admin") return;
    void loadSettings();
    void loadCash();
  }, [isLoading, role, loadSettings, loadCash]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Spinner className="text-brand" />
      </div>
    );
  }
  if (role !== "admin") {
    return (
      <Card className="text-center text-muted py-10">
        <p>Hanya admin yang dapat mengakses halaman ini.</p>
      </Card>
    );
  }

  async function saveDailyRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const amount = Number(dailyRate);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      showToast("Masukkan gaji harian berupa angka bulat, minimal Rp0.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultDailyRate: amount }),
      });
      showToast("Gaji harian default tersimpan.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan gaji harian");
    } finally {
      setSaving(false);
    }
  }

  async function openCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const amount = Number(openingAmount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      showToast("Masukkan saldo awal berupa angka bulat, minimal Rp0.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ data: CashState }>("/api/cash-shifts", {
        method: "POST",
        body: JSON.stringify({ openingCash: amount, note: note.trim() }),
      });
      setCash(res?.data ?? null);
      setOpeningAmount("");
      setNote("");
      showToast("Shift kas dibuka.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal membuka kas");
    } finally {
      setSaving(false);
    }
  }

  async function closeCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!cash?.open) return;
    const amount = Number(closingAmount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      showToast("Masukkan jumlah kas akhir berupa angka bulat, minimal Rp0.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ data: CashState }>(`/api/cash-shifts/${cash.open.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingCash: amount }),
      });
      setCash(res?.data ?? null);
      setClosingAmount("");
      showToast("Shift kas ditutup.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menutup kas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-36">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Gaji & Kas</h1>
        <p className="mt-1 text-muted">Atur acuan gaji harian dan catat pergantian kas.</p>
      </div>

      {loadingSettings || cashLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand" />
        </div>
      ) : null}

      {!loadingSettings && !cashLoading && !cash && (
        <Card className="text-center text-muted py-8">
          <Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada data kas
        </Card>
      )}

      {!loadingSettings && !cashLoading && cash && (
        <>
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Banknote className="h-5 w-5" /></div>
              <div><CardTitle>Pengaturan gaji</CardTitle><p className="text-sm text-muted">Acuan gaji harian untuk karyawan baru.</p></div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={saveDailyRate}>
              <Field label="Gaji harian default (Rp)">
                <Input type="number" min="0" step="1" inputMode="numeric" value={dailyRate} onChange={(event) => { setDailyRate(event.target.value); }} placeholder="Masukkan nominal" disabled={loadingSettings} />
              </Field>
              <p className="text-sm text-muted">Tarif gaji tiap karyawan tetap diatur pada data karyawan.</p>
              <Button variant="primary" type="submit" fullWidth disabled={loadingSettings}>Simpan gaji harian</Button>
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
                <Button variant="primary" type="submit" fullWidth>Tutup kas</Button>
              </form>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={openCash}>
                <Field label="Saldo awal (Rp)"><Input type="number" min="0" step="1" inputMode="numeric" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="Masukkan saldo awal" /></Field>
                <Field label="Catatan (opsional)"><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contoh: pergantian shift pagi" /></Field>
                <Button variant="primary" type="submit" fullWidth>Buka kas</Button>
              </form>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info"><Clock3 className="h-5 w-5" /></div>
              <div><CardTitle>Riwayat kas</CardTitle><p className="text-sm text-muted">Tersimpan di server outlet.</p></div>
            </div>
            {(cash.history ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Belum ada sesi kas tercatat.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {(cash.history ?? []).map((item) => (
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
        </>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}
    </div>
  );
}
