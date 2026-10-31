"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Banknote, Calendar, CreditCard, Download, Package, Printer, TrendingUp, Users, Wrench } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api-client";
import { formatTanggal, formatAngka, rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { VehicleType } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

type PaymentMethod = "Tunai" | "Transfer";
type Tab = "omzet" | "paket" | "addon" | "pembayaran" | "karyawan" | "kas";

type ReportTx = {
  id: string;
  invoiceNo: string;
  date: string;
  queueNo: string;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  packageName: string;
  addons: { name: string; price: number; qty: number; subtotal: number }[];
  employee: string;
  total: number;
  customerName: string;
  plate: string;
};

type PaketRow = { packageName: string; count: number; total: number };
type AddonRow = { name: string; count: number; total: number };
type PaymentRow = { method: string; count: number; total: number };
type EmployeeRow = { employee: string; count: number; total: number };
type CashReport = {
  open?: number | null;
  totalTunai?: number | null;
  keluar?: number | null;
  expectedCash?: number | null;
  closingCash?: number | null;
  actual?: number | null;
  difference?: number | null;
  history?: unknown[];
  [key: string]: unknown;
};

type ReportData = Record<Tab, unknown>;

const ENDPOINT: Record<Tab, string> = {
  omzet: "transactions",
  paket: "paket",
  addon: "addon",
  pembayaran: "payment-method",
  karyawan: "employee",
  kas: "cash",
};

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "omzet", label: "Omzet per Periode", icon: BarChart3 },
  { key: "paket", label: "Rekap Paket", icon: Package },
  { key: "addon", label: "Rekap Add-on", icon: Wrench },
  { key: "pembayaran", label: "Metode Pembayaran", icon: CreditCard },
  { key: "karyawan", label: "Rekap Karyawan", icon: Users },
  { key: "kas", label: "Rekap Kas Harian", icon: Banknote },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Bangun Date lokal dari string "YYYY-MM-DD" agar kunci hari cocok dengan t.date.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((v) => Number(v));
  return new Date(y, m - 1, d);
}

// formatTanggal berzona UTC bisa geser hari untuk string "YYYY-MM-DD"; bangun Date lokal dulu.
function tgl(iso: string): string {
  if (!iso || typeof iso !== "string") return "-";
  const [y, m, d] = iso.split("-").map((v) => Number(v));
  if (!y || !m || !d) return iso;
  return formatTanggal(new Date(y, m - 1, d));
}

function initialData(): ReportData {
  return {
    omzet: [],
    paket: [],
    addon: [],
    pembayaran: [],
    karyawan: [],
    kas: null,
  };
}

function initialLoading(): Record<Tab, boolean> {
  return { omzet: true, paket: true, addon: true, pembayaran: true, karyawan: true, kas: true };
}

function initialError(): Record<Tab, string> {
  return { omzet: "", paket: "", addon: "", pembayaran: "", karyawan: "", kas: "" };
}

export default function LaporanPage() {
  const [mode, setMode] = useState<"single" | "range">("single");
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [tab, setTab] = useState<Tab>("omzet");

  const [data, setData] = useState<ReportData>(initialData());
  const [loading, setLoading] = useState<Record<Tab, boolean>>(initialLoading());
  const [error, setError] = useState<Record<Tab, string>>(initialError());
  const { toast, showToast } = useToast();

  const cancelled = useRef(false);
  const controllersRef = useRef<Map<Tab, AbortController>>(new Map());

  const fetchTab = useCallback(async (t: Tab, f: string, tto: string) => {
    controllersRef.current.get(t)?.abort();
    const controller = new AbortController();
    controllersRef.current.set(t, controller);
    try {
      if (t === "kas") {
        const res = await apiFetch<{ data: CashReport }>(`/api/reports/cash?date=${encodeURIComponent(f)}`, {
          signal: controller.signal,
        });
        if (cancelled.current || controller.signal.aborted) return;
        setData((prev) => ({ ...prev, kas: res?.data ?? null }));
      } else {
        const res = await apiFetch<{ data: unknown[] }>(
          `/api/reports/${ENDPOINT[t]}?from=${encodeURIComponent(f)}&to=${encodeURIComponent(tto)}`,
          { signal: controller.signal },
        );
        if (cancelled.current || controller.signal.aborted) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setData((prev) => ({ ...prev, [t]: rows }));
      }
      if (cancelled.current || controller.signal.aborted) return;
      setError((prev) => ({ ...prev, [t]: "" }));
    } catch (e) {
      if (controller.signal.aborted || cancelled.current) return;
      setData((prev) => ({ ...prev, [t]: t === "kas" ? null : [] }));
      setError((prev) => ({ ...prev, [t]: e instanceof Error ? e.message : "Gagal memuat data." }));
    } finally {
      if (!controller.signal.aborted) {
        setLoading((prev) => ({ ...prev, [t]: false }));
      }
    }
  }, []);

  const rangeFrom = mode === "single" ? date : from;
  const rangeTo = mode === "single" ? date : to;
  const invalidRange = mode === "range" && rangeFrom > rangeTo;

  useEffect(() => {
    cancelled.current = false;
    if (invalidRange) {
      setLoading({ omzet: false, paket: false, addon: false, pembayaran: false, karyawan: false, kas: false });
      return () => {
        cancelled.current = true;
        controllersRef.current.forEach((c) => c.abort());
        controllersRef.current.clear();
      };
    }
    const f = mode === "single" ? date : from;
    const t = mode === "single" ? date : to;

    (async () => {
      setLoading(initialLoading());
      setError(initialError());

      const periodTabs: Tab[] = ["omzet", "paket", "addon", "pembayaran", "karyawan"];
      await Promise.all(periodTabs.map((x) => fetchTab(x, f, t)));
      if (cancelled.current) return;
      if (mode === "single") {
        await fetchTab("kas", f, f);
      } else {
        setData((prev) => ({ ...prev, kas: null }));
        setLoading((prev) => ({ ...prev, kas: false }));
        setError((prev) => ({ ...prev, kas: "" }));
      }
    })();

    return () => {
      cancelled.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const controllers = controllersRef.current;
      controllers.forEach((c) => c.abort());
      controllers.clear();
    };
  }, [mode, date, from, to, fetchTab, invalidRange]);

  const txs = useMemo(() => (Array.isArray(data.omzet) ? (data.omzet as ReportTx[]) : []), [data.omzet]);
  const paketRows = useMemo(() => (Array.isArray(data.paket) ? (data.paket as PaketRow[]) : []), [data.paket]);
  const addonRows = useMemo(() => (Array.isArray(data.addon) ? (data.addon as AddonRow[]) : []), [data.addon]);
  const paymentRows = useMemo(() => (Array.isArray(data.pembayaran) ? (data.pembayaran as PaymentRow[]) : []), [data.pembayaran]);
  const employeeRows = useMemo(() => (Array.isArray(data.karyawan) ? (data.karyawan as EmployeeRow[]) : []), [data.karyawan]);
  const cash = (data.kas as CashReport | null) ?? null;

  const omzetHari = txs.reduce((s, t) => s + t.total, 0);
  const countTx = txs.length;
  const avgTx = countTx ? Math.round(omzetHari / countTx) : 0;
  const tunai = txs.filter((t) => t.paymentMethod === "Tunai").reduce((s, t) => s + t.total, 0);
  const transfer = txs.filter((t) => t.paymentMethod === "Transfer").reduce((s, t) => s + t.total, 0);
  const motor = txs.filter((t) => t.vehicleType === "motor").length;
  const mobil = txs.filter((t) => t.vehicleType === "mobil").length;

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    txs.forEach((t) => {
      if (!t?.date) return;
      map.set(t.date, (map.get(t.date) ?? 0) + (t.total ?? 0));
    });
    const days: { date: string; omzet: number }[] = [];
    if (!rangeFrom || !rangeTo) return days;
    const d = parseLocalDate(rangeFrom);
    const end = parseLocalDate(rangeTo);
    if (isNaN(d.getTime()) || isNaN(end.getTime())) return days;
    while (d <= end) {
      const iso = isoDate(d);
      days.push({ date: iso, omzet: map.get(iso) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [txs, rangeFrom, rangeTo]);
  const maxTrend = Math.max(1, ...trend.map((t) => t.omzet));

  const showToastMsg = (msg: string) => {
    showToast(msg);
  };

  async function downloadCsv(type: string) {
    const qs = new URLSearchParams({ type, from: rangeFrom, to: rangeTo });
    try {
      const res = await fetch(`/api/reports/export.csv?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Server menolak unduhan CSV");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = rangeTo !== rangeFrom ? `_${rangeTo}` : "";
      a.download = `laporan-${type}-${rangeFrom}${suffix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      showToastMsg(e instanceof Error ? e.message : "Gagal unduh CSV");
    }
  }

  function handlePrint() {
    window.print();
  }

  const periodLabel = mode === "single" ? `Hari ${tgl(rangeFrom)}` : `Periode ${tgl(rangeFrom)} s.d ${tgl(rangeTo)}`;

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Laporan</h1>
          <p className="text-sm text-muted">Ringkasan omzet dan transaksi outlet</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="primary" size="sm" onClick={handlePrint} disabled={invalidRange}>
            <Printer className="h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      {/* Filter tanggal */}
      <Card className="flex flex-col gap-3 no-print">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-ink">
          <Calendar className="h-4 w-4 text-muted" />
          <span className="font-display font-bold text-ink">Filter tanggal</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold text-ink">
          <button
            type="button"
            aria-pressed={mode === "single"}
            onClick={() => setMode("single")}
            className={cn(
              "h-9 px-3 rounded-md border transition",
              mode === "single" ? "bg-accent text-ink border-accent" : "bg-surface text-ink border-line hover:bg-bg",
            )}
          >
            Tunggal
          </button>
          <button
            type="button"
            aria-pressed={mode === "range"}
            onClick={() => setMode("range")}
            className={cn(
              "h-9 px-3 rounded-md border transition",
              mode === "range" ? "bg-accent text-ink border-accent" : "bg-surface text-ink border-line hover:bg-bg",
            )}
          >
            Rentang
          </button>
        </div>
        {mode === "single" ? (
          <Field label="Tanggal">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dari">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Sampai">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}
        {invalidRange && (
          <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            Tanggal awal tidak boleh lebih besar dari tanggal akhir.
          </p>
        )}
      </Card>

      {/* Dashboard harian */}
      <section className="flex flex-col gap-2 no-print">
        <h2 className="font-display text-sm font-bold text-ink">Dashboard — {periodLabel}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs text-muted">Omzet</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink">{rupiah(omzetHari)}</p>
          </Card>
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs text-muted">Transaksi</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink">{formatAngka(countTx)}</p>
          </Card>
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs text-muted">Rata-rata / transaksi</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink">{rupiah(avgTx)}</p>
          </Card>
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs text-muted">Tunai</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink">{rupiah(tunai)}</p>
          </Card>
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs text-muted">Transfer</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink">{rupiah(transfer)}</p>
          </Card>
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs text-muted">Motor / Mobil</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink">{formatAngka(motor)} / {formatAngka(mobil)}</p>
          </Card>
        </div>

        {/* Tren omzet */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-ink">
            <TrendingUp className="h-4 w-4 text-brand" /> <span className="font-display font-bold text-ink">Tren omzet per hari</span>
          </div>
          <div className="flex items-stretch gap-1 h-44">
            {trend.map((t) => {
              const pct = (t.omzet / maxTrend) * 100;
              return (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t-md bg-brand/80 hover:bg-brand transition" style={{ height: `${Math.max(4, pct)}%` }} title={rupiah(t.omzet)} aria-label={`${tgl(t.date)}: ${rupiah(t.omzet)}`} />
                  </div>
                  <span className="text-[10px] font-semibold text-muted">{tgl(t.date)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted">
            <span>{tgl(rangeFrom)}</span>
            <span>{rupiah(maxTrend)}</span>
          </div>
        </Card>
      </section>

      {/* Tabs laporan */}
      <div className="overflow-x-auto border-b border-line pb-1 no-print">
        <div className="flex gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "h-10 px-3 rounded-md border text-sm font-semibold transition active:scale-[0.98] whitespace-nowrap inline-flex items-center gap-1.5",
                tab === t.key
                  ? "bg-accent text-ink border-accent shadow-sm"
                  : "bg-surface text-ink border-line hover:bg-bg",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel laporan aktif */}
      <section className="flex flex-col gap-6">
        {tab === "omzet" && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand" />
                <span className="font-display font-bold text-ink">Omzet per Periode</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => downloadCsv("transaksi")} disabled={loading.omzet || txs.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>

            {loading.omzet && (
              <div className="flex items-center justify-center py-12">
                <Spinner className="text-brand" />
                <span className="ml-2 text-muted">Memuat data transaksi...</span>
              </div>
            )}
            {error.omzet && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error.omzet}</div>
            )}
            {!loading.omzet && !error.omzet && txs.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Tidak ada transaksi pada periode ini.</p>
            )}
            {!loading.omzet && !error.omzet && txs.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-muted uppercase">
                      <th scope="col" className="py-2 pr-2">Tanggal</th>
                      <th scope="col" className="py-2 px-2">Invoice</th>
                      <th scope="col" className="py-2 px-2">Antrean</th>
                      <th scope="col" className="py-2 px-2">Kendaraan</th>
                      <th scope="col" className="py-2 px-2">Paket</th>
                      <th scope="col" className="py-2 px-2">Add-on</th>
                      <th scope="col" className="py-2 px-2">Karyawan</th>
                      <th scope="col" className="py-2 px-2">Metode</th>
                      <th scope="col" className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t.id} className="border-t border-line">
                        <td scope="row" className="py-2 pr-2 text-sm text-ink">{tgl(t.date)}</td>
                        <td className="py-2 px-2 text-sm font-semibold text-ink truncate">{t.invoiceNo}</td>
                        <td className="py-2 px-2 text-sm text-ink">{t.queueNo}</td>
                        <td className="py-2 px-2 text-sm text-ink">{t.vehicleType === "motor" ? "Motor" : "Mobil"}</td>
                        <td className="py-2 px-2 text-sm text-ink truncate">{t.packageName}</td>
                        <td className="py-2 px-2 text-sm text-muted truncate">
                          {(Array.isArray(t.addons) ? t.addons : []).map((a) => `${a.name} x${a.qty}`).join(", ") || "—"}
                        </td>
                        <td className="py-2 px-2 text-sm text-ink">{t.employee}</td>
                        <td className="py-2 px-2 text-sm text-ink"><Badge tone={t.paymentMethod === "Tunai" ? "success" : "info"}>{t.paymentMethod}</Badge></td>
                        <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(t.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "paket" && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-brand" />
                <span className="font-display font-bold text-ink">Rekap Paket</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => downloadCsv("paket")} disabled={loading.paket || paketRows.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Jenis paket</p>
                <p className="font-bold tabular-nums text-ink">{formatAngka(paketRows.length)}</p>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Terjual</p>
                <p className="font-bold tabular-nums text-ink">{formatAngka(paketRows.reduce((s, r) => s + r.count, 0))}</p>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Omzet paket</p>
                <p className="font-bold tabular-nums text-ink">{rupiah(paketRows.reduce((s, r) => s + r.total, 0))}</p>
              </Card>
            </div>
            {loading.paket && (
              <div className="flex items-center justify-center py-12"><Spinner className="text-brand" /></div>
            )}
            {error.paket && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error.paket}</div>}
            {!loading.paket && !error.paket && paketRows.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Tidak ada data paket pada periode ini.</p>
            )}
            {!loading.paket && !error.paket && paketRows.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-muted uppercase">
                      <th scope="col" className="py-2 pr-2">Paket</th>
                      <th scope="col" className="py-2 px-2 text-right">Jumlah</th>
                      <th scope="col" className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paketRows.map((r) => (
                      <tr key={r.packageName} className="border-t border-line">
                        <td scope="row" className="py-2 pr-2 text-sm font-semibold text-ink truncate">{r.packageName}</td>
                        <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(r.count)}</td>
                        <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(r.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line font-bold">
                      <td scope="row" className="py-2 pr-2 text-sm text-ink">Total</td>
                      <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(paketRows.reduce((s, r) => s + r.count, 0))}</td>
                      <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(paketRows.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "addon" && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-brand" />
                <span className="font-display font-bold text-ink">Rekap Add-on</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => downloadCsv("addon")} disabled={loading.addon || addonRows.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Jenis add-on</p>
                <p className="font-bold tabular-nums text-ink">{formatAngka(addonRows.length)}</p>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Terjual</p>
                <p className="font-bold tabular-nums text-ink">{formatAngka(addonRows.reduce((s, r) => s + r.count, 0))}</p>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Omzet add-on</p>
                <p className="font-bold tabular-nums text-ink">{rupiah(addonRows.reduce((s, r) => s + r.total, 0))}</p>
              </Card>
            </div>
            {loading.addon && (
              <div className="flex items-center justify-center py-12"><Spinner className="text-brand" /></div>
            )}
            {error.addon && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error.addon}</div>}
            {!loading.addon && !error.addon && addonRows.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Tidak ada data add-on pada periode ini.</p>
            )}
            {!loading.addon && !error.addon && addonRows.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-muted uppercase">
                      <th scope="col" className="py-2 pr-2">Add-on</th>
                      <th scope="col" className="py-2 px-2 text-right">Jumlah</th>
                      <th scope="col" className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addonRows.map((r) => (
                      <tr key={r.name} className="border-t border-line">
                        <td scope="row" className="py-2 pr-2 text-sm font-semibold text-ink truncate">{r.name}</td>
                        <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(r.count)}</td>
                        <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(r.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line font-bold">
                      <td scope="row" className="py-2 pr-2 text-sm text-ink">Total</td>
                      <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(addonRows.reduce((s, r) => s + r.count, 0))}</td>
                      <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(addonRows.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "pembayaran" && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand" />
                <span className="font-display font-bold text-ink">Rekap Metode Pembayaran</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => downloadCsv("pembayaran")} disabled={loading.pembayaran || paymentRows.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="flex flex-col gap-1 p-4">
                <p className="text-xs text-muted">Tunai</p>
                <p className="font-bold tabular-nums text-ink">{rupiah(tunai)}</p>
                <p className="text-xs text-muted">{formatAngka(txs.filter((t) => t.paymentMethod === "Tunai").length)} transaksi</p>
              </Card>
              <Card className="flex flex-col gap-1 p-4">
                <p className="text-xs text-muted">Transfer</p>
                <p className="font-bold tabular-nums text-ink">{rupiah(transfer)}</p>
                <p className="text-xs text-muted">{formatAngka(txs.filter((t) => t.paymentMethod === "Transfer").length)} transaksi</p>
              </Card>
            </div>
            {loading.pembayaran && (
              <div className="flex items-center justify-center py-12"><Spinner className="text-brand" /></div>
            )}
            {error.pembayaran && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error.pembayaran}</div>}
            {!loading.pembayaran && !error.pembayaran && paymentRows.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Tidak ada data pembayaran pada periode ini.</p>
            )}
            {!loading.pembayaran && !error.pembayaran && paymentRows.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-muted uppercase">
                      <th scope="col" className="py-2 pr-2">Metode</th>
                      <th scope="col" className="py-2 px-2 text-right">Jumlah</th>
                      <th scope="col" className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRows.map((r) => (
                      <tr key={r.method} className="border-t border-line">
                        <td scope="row" className="py-2 pr-2 text-sm font-semibold text-ink"><Badge tone={r.method === "Tunai" ? "success" : "info"}>{r.method}</Badge></td>
                        <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(r.count)}</td>
                        <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(r.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line font-bold">
                      <td scope="row" className="py-2 pr-2 text-sm text-ink">Total</td>
                      <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(paymentRows.reduce((s, r) => s + r.count, 0))}</td>
                      <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(paymentRows.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "karyawan" && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" />
                <span className="font-display font-bold text-ink">Rekap Karyawan</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => downloadCsv("karyawan")} disabled={loading.karyawan || employeeRows.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Karyawan aktif</p>
                <p className="font-bold tabular-nums text-ink">{formatAngka(employeeRows.length)}</p>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Total transaksi</p>
                <p className="font-bold tabular-nums text-ink">{formatAngka(employeeRows.reduce((s, r) => s + r.count, 0))}</p>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <p className="text-xs text-muted">Omzet karyawan</p>
                <p className="font-bold tabular-nums text-ink">{rupiah(employeeRows.reduce((s, r) => s + r.total, 0))}</p>
              </Card>
            </div>
            {loading.karyawan && (
              <div className="flex items-center justify-center py-12"><Spinner className="text-brand" /></div>
            )}
            {error.karyawan && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error.karyawan}</div>}
            {!loading.karyawan && !error.karyawan && employeeRows.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Tidak ada data karyawan pada periode ini.</p>
            )}
            {!loading.karyawan && !error.karyawan && employeeRows.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-muted uppercase">
                      <th scope="col" className="py-2 pr-2">Karyawan</th>
                      <th scope="col" className="py-2 px-2 text-right">Jumlah transaksi</th>
                      <th scope="col" className="py-2 pl-2 text-right">Total omzet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeRows.map((r) => (
                      <tr key={r.employee} className="border-t border-line">
                        <td scope="row" className="py-2 pr-2 text-sm font-semibold text-ink truncate">{r.employee}</td>
                        <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(r.count)}</td>
                        <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(r.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line font-bold">
                      <td scope="row" className="py-2 pr-2 text-sm text-ink">Total</td>
                      <td className="py-2 px-2 text-sm text-right text-ink">{formatAngka(employeeRows.reduce((s, r) => s + r.count, 0))}</td>
                      <td className="py-2 pl-2 text-sm text-right font-semibold tabular-nums text-ink">{rupiah(employeeRows.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "kas" && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-brand" />
              <span className="font-display font-bold text-ink">Rekap Kas Harian</span>
            </div>

            {mode !== "single" && (
              <p className="text-sm text-muted">Pilih mode &quot;Tanggal tunggal&quot; untuk melihat rekap kas harian.</p>
            )}

            {mode === "single" && loading.kas && (
              <div className="flex items-center justify-center py-12"><Spinner className="text-brand" /></div>
            )}

            {mode === "single" && error.kas && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error.kas}</div>
            )}

            {mode === "single" && !loading.kas && !error.kas && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-fit self-start"
                  onClick={() => downloadCsv("kas")}
                  disabled={!cash}
                >
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card className="p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted">Saldo awal</p>
                    <p className={cn("font-bold tabular-nums", cash?.open === null || cash?.open === undefined ? "text-muted" : "text-ink")}>
                      {cash?.open === null || cash?.open === undefined ? "-" : rupiah(Number(cash.open))}
                    </p>
                  </Card>
                  <Card className="p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted">Masuk (tunai)</p>
                    <p className="font-bold tabular-nums text-ink">{rupiah(Number(cash?.totalTunai ?? 0))}</p>
                  </Card>
                  <Card className="p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted">Keluar</p>
                    <p className="font-bold tabular-nums text-ink">{rupiah(Number(cash?.keluar ?? 0))}</p>
                  </Card>
                  <Card className="p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted">Saldo akhir teori</p>
                    <p className={cn("font-bold tabular-nums", cash?.expectedCash == null ? "text-muted" : "text-ink")}>
                      {cash?.expectedCash == null ? "-" : rupiah(Number(cash?.expectedCash ?? 0))}
                    </p>
                  </Card>
                  <Card className="p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted">Kas aktual</p>
                    <p className={cn("font-bold tabular-nums", (cash?.closingCash ?? cash?.actual) == null ? "text-muted" : "text-ink")}>
                      {(cash?.closingCash ?? cash?.actual) == null ? "-" : rupiah(Number(cash?.closingCash ?? cash?.actual ?? 0))}
                    </p>
                  </Card>
                  <Card className="p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted">Selisih</p>
                    <p className={cn("font-bold tabular-nums", cash?.difference == null ? "text-muted" : (cash?.difference ?? 0) < 0 ? "text-danger" : "text-ink")}>
                      {cash?.difference == null ? "-" : rupiah(Number(cash?.difference ?? 0))}
                    </p>
                  </Card>
                </div>
                <p className="text-xs text-muted">
                  Saldo akhir teori = saldo awal + masuk − keluar. Selisih = kas aktual − saldo akhir teori.
                </p>
              </>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
