"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api-client";
import {
  Calendar,
  Banknote,
  CreditCard,
  Download,
  Printer,
  TrendingUp,
  Receipt,
  Users,
  Package,
  Wrench,
  Filter,
  ChevronDown,
} from "lucide-react";

type VehicleType = "motor" | "mobil";
type PaymentMethod = "Tunai" | "Transfer";
type Period = "hari" | "minggu" | "bulan" | "custom";

type Tx = {
  id: string;
  invoiceNo: string;
  date: string;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  packageName: string;
  addons: { name: string; price: number; qty: number; subtotal: number }[];
  employee: string;
  total: number;
};

type ApiTx = Omit<Tx, "id"> & { id: string };

type CashShift = {
  id: string;
  date: string;
  openedByName: string;
  openingCash: number;
  closedByName: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  closedAt: string | null;
};

function isoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function LaporanPage() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState("");
  const [period, setPeriod] = useState<Period>("minggu");
  const [vehicleFilter, setVehicleFilter] = useState<"semua" | VehicleType>("semua");
  const [paymentFilter, setPaymentFilter] = useState<"semua" | PaymentMethod>("semua");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [cashShift, setCashShift] = useState<CashShift | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    setCustomFrom(isoDate(from));
    setCustomTo(isoDate(today));
    setMounted(true);
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    if (period === "hari") {
      // today only
    } else if (period === "minggu") {
      start.setDate(end.getDate() - 6);
    } else if (period === "bulan") {
      start.setDate(1);
    } else {
      return { from: customFrom, to: customTo };
    }
    return { from: isoDate(start), to: isoDate(end) };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (!range.from || !range.to) return;
    let cancelled = false;
    setTxLoading(true);
    apiFetch<{ data: ApiTx[] }>(
      `/api/reports/transactions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    )
      .then((res) => {
        if (cancelled) return;
        setTransactions(res.data);
        setTxError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setTransactions([]);
        setTxError(error instanceof Error ? error.message : "Gagal memuat laporan");
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    apiFetch<{ data: { history: CashShift[] } }>("/api/cash-shifts")
      .then((res) => setCashShift(res.data.history[0] ?? null))
      .catch(() => setCashShift(null));
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (vehicleFilter !== "semua" && t.vehicleType !== vehicleFilter) return false;
      if (paymentFilter !== "semua" && t.paymentMethod !== paymentFilter) return false;
      return true;
    });
  }, [transactions, vehicleFilter, paymentFilter]);

  const omzet = useMemo(() => filtered.reduce((s, t) => s + t.total, 0), [filtered]);
  const count = filtered.length;
  const avg = count > 0 ? Math.round(omzet / count) : 0;
  const tunai = useMemo(() => filtered.filter((t) => t.paymentMethod === "Tunai").reduce((s, t) => s + t.total, 0), [filtered]);
  const transfer = useMemo(() => filtered.filter((t) => t.paymentMethod === "Transfer").reduce((s, t) => s + t.total, 0), [filtered]);

  const trend = useMemo(() => {
    const days: { date: string; omzet: number }[] = [];
    const length = period === "hari" ? 1 : period === "bulan" ? 30 : period === "custom" && customFrom && customTo
      ? Math.min(90, Math.max(1, Math.round((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000) + 1))
      : 7;
    const endDate = period === "custom" && customTo ? new Date(`${customTo}T12:00:00`) : today;
    for (let i = length - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      const iso = isoDate(d);
      const dayOmzet = transactions
        .filter((t) => t.date === iso)
        .filter((t) => (vehicleFilter === "semua" ? true : t.vehicleType === vehicleFilter))
        .filter((t) => (paymentFilter === "semua" ? true : t.paymentMethod === paymentFilter))
        .reduce((s, t) => s + t.total, 0);
      days.push({ date: iso, omzet: dayOmzet });
    }
    return days;
  }, [transactions, vehicleFilter, paymentFilter, today, period, customFrom, customTo]);

  const maxTrend = useMemo(() => Math.max(1, ...trend.map((t) => t.omzet)), [trend]);
  const trendLabel = period === "hari" ? "Trend Harian (1 hari)"
    : period === "bulan" ? "Trend Harian (30 hari)"
    : period === "custom" && customFrom && customTo
      ? `Trend Harian (${trend.length} hari)`
      : "Trend Harian (7 hari)";

  const perPaket = useMemo(() => {
    const map = new Map<string, { jumlah: number; omzet: number }>();
    filtered.forEach((t) => {
      const cur = map.get(t.packageName) ?? { jumlah: 0, omzet: 0 };
      cur.jumlah += 1;
      cur.omzet += t.total;
      map.set(t.packageName, cur);
    });
    return Array.from(map.entries())
      .map(([paket, v]) => ({ paket, jumlah: v.jumlah, omzet: v.omzet }))
      .sort((a, b) => b.omzet - a.omzet);
  }, [filtered]);

  const perAddon = useMemo(() => {
    const map = new Map<string, { jumlah: number; omzet: number }>();
    filtered.forEach((t) => {
      t.addons.forEach((a) => {
        const cur = map.get(a.name) ?? { jumlah: 0, omzet: 0 };
        cur.jumlah += a.qty;
        cur.omzet += a.subtotal;
        map.set(a.name, cur);
      });
    });
    return Array.from(map.entries())
      .map(([addon, v]) => ({ addon, jumlah: v.jumlah, omzet: v.omzet }))
      .sort((a, b) => b.omzet - a.omzet);
  }, [filtered]);

  const perMetode = useMemo(() => {
    const map = new Map<PaymentMethod, { jumlah: number; omzet: number }>();
    (["Tunai", "Transfer"] as PaymentMethod[]).forEach((m) => map.set(m, { jumlah: 0, omzet: 0 }));
    filtered.forEach((t) => {
      const cur = map.get(t.paymentMethod)!;
      cur.jumlah += 1;
      cur.omzet += t.total;
    });
    return Array.from(map.entries()).map(([metode, v]) => ({ metode, jumlah: v.jumlah, omzet: v.omzet }));
  }, [filtered]);

  const perKaryawan = useMemo(() => {
    const map = new Map<string, { jumlah: number; omzet: number }>();
    filtered.forEach((t) => {
      const cur = map.get(t.employee) ?? { jumlah: 0, omzet: 0 };
      cur.jumlah += 1;
      cur.omzet += t.total;
      map.set(t.employee, cur);
    });
    return Array.from(map.entries())
      .map(([karyawan, v]) => ({ karyawan, jumlah: v.jumlah, omzet: v.omzet }))
      .sort((a, b) => b.omzet - a.omzet);
  }, [filtered]);

  function handleExportCsv() {
    const header = ["ID", "Tanggal", "Kendaraan", "Metode Bayar", "Paket", "Add-on", "Karyawan", "Total"];
    const rows = filtered.map((t) => [
      t.id,
      t.date,
      t.vehicleType,
      t.paymentMethod,
      t.packageName,
      t.addons.map((addon) => `${addon.name} x${addon.qty}`).join("; "),
      t.employee,
      String(t.total),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${isoDate(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const periodOptions: { key: Period; label: string }[] = [
    { key: "hari", label: "Hari ini" },
    { key: "minggu", label: "Minggu ini" },
    { key: "bulan", label: "Bulan ini" },
    { key: "custom", label: "Pilih tanggal" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Laporan</h1>
          <p className="text-sm text-muted">Ringkasan penjualan outlet</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      {txError && (
        <div className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {txError}
        </div>
      )}
      {txLoading && (
        <p className="text-sm text-muted">Memuat data laporan...</p>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Calendar className="h-4 w-4 text-muted" /> <span>Pilih periode laporan</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {periodOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => setPeriod(o.key)}
              className={cn(
                "h-11 rounded-[var(--radius-sm)] border text-sm font-semibold transition active:scale-[0.98]",
                period === o.key
                  ? "bg-accent text-ink border-accent"
                  : "bg-surface text-ink border-line hover:bg-bg",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dari">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </Field>
            <Field label="Sampai">
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </Field>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Filter className="h-4 w-4 text-brand" /> Filter
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tipe kendaraan">
            <div className="relative">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value as "semua" | VehicleType)}
                className="w-full h-12 px-4 pr-10 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none appearance-none"
              >
                <option value="semua">Semua</option>
                <option value="motor">Motor</option>
                <option value="mobil">Mobil</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            </div>
          </Field>
          <Field label="Metode bayar">
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as "semua" | PaymentMethod)}
                className="w-full h-12 px-4 pr-10 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none appearance-none"
              >
                <option value="semua">Semua</option>
                <option value="Tunai">Tunai</option>
                <option value="Transfer">Transfer</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            </div>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Banknote className="h-5 w-5" /> Omzet terkumpul
          </div>
          <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">{rupiah(omzet)}</p>
          <p className="text-sm text-muted">{count} transaksi dalam periode ini</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-sm font-semibold">
            <Receipt className="h-4 w-4 text-brand" /> Jumlah transaksi
          </div>
          <p className="font-display text-2xl font-bold text-ink">{count}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-brand" /> Rata-rata per transaksi
          </div>
          <p className="font-display text-xl font-bold text-ink">{rupiah(avg)}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-brand" /> Tunai vs Transfer
          </div>
          <p className="text-sm font-bold text-ink">{rupiah(tunai)}</p>
          <p className="text-sm font-bold text-muted">{rupiah(transfer)}</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">{trendLabel}</CardTitle>
        <div className="flex items-end gap-2 h-40">
          {trend.map((t) => {
            const pct = (t.omzet / maxTrend) * 100;
            return (
              <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md bg-brand/80 hover:bg-brand transition"
                    style={{ height: `${Math.max(4, pct)}%` }}
                    title={rupiah(t.omzet)}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted">
                  {(trend.length <= 14 || trend.indexOf(t) % Math.ceil(trend.length / 7) === 0)
                    ? new Date(`${t.date}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>0</span>
          <span>{rupiah(maxTrend)}</span>
        </div>
      </Card>

      <TableCard title="Rekap per Paket" icon={<Package className="h-4 w-4 text-brand" />}>
        <thead>
          <tr className="text-left text-xs font-bold text-muted uppercase">
            <th className="py-2 pr-2">Paket</th>
            <th className="py-2 px-2 text-right">Jumlah</th>
            <th className="py-2 pl-2 text-right">Omzet</th>
          </tr>
        </thead>
        <tbody>
          {perPaket.map((r) => (
            <tr key={r.paket} className="border-t border-line">
              <td className="py-2 pr-2 text-sm font-semibold text-ink">{r.paket}</td>
              <td className="py-2 px-2 text-sm text-right text-ink">{r.jumlah}</td>
              <td className="py-2 pl-2 text-sm text-right font-semibold text-ink">{rupiah(r.omzet)}</td>
            </tr>
          ))}
          {perPaket.length === 0 && (
            <tr><td colSpan={3} className="py-4 text-center text-sm text-muted">Tidak ada data</td></tr>
          )}
        </tbody>
      </TableCard>

      <TableCard title="Rekap per Add-on" icon={<Wrench className="h-4 w-4 text-brand" />}>
        <thead>
          <tr className="text-left text-xs font-bold text-muted uppercase">
            <th className="py-2 pr-2">Add-on</th>
            <th className="py-2 px-2 text-right">Jumlah</th>
            <th className="py-2 pl-2 text-right">Omzet</th>
          </tr>
        </thead>
        <tbody>
          {perAddon.map((r) => (
            <tr key={r.addon} className="border-t border-line">
              <td className="py-2 pr-2 text-sm font-semibold text-ink">{r.addon}</td>
              <td className="py-2 px-2 text-sm text-right text-ink">{r.jumlah}</td>
              <td className="py-2 pl-2 text-sm text-right font-semibold text-ink">{rupiah(r.omzet)}</td>
            </tr>
          ))}
          {perAddon.length === 0 && (
            <tr><td colSpan={3} className="py-4 text-center text-sm text-muted">Tidak ada data</td></tr>
          )}
        </tbody>
      </TableCard>

      <TableCard title="Rekap per Metode Bayar" icon={<CreditCard className="h-4 w-4 text-brand" />}>
        <thead>
          <tr className="text-left text-xs font-bold text-muted uppercase">
            <th className="py-2 pr-2">Metode</th>
            <th className="py-2 px-2 text-right">Jumlah</th>
            <th className="py-2 pl-2 text-right">Omzet</th>
          </tr>
        </thead>
        <tbody>
          {perMetode.map((r) => (
            <tr key={r.metode} className="border-t border-line">
              <td className="py-2 pr-2 text-sm font-semibold text-ink">{r.metode}</td>
              <td className="py-2 px-2 text-sm text-right text-ink">{r.jumlah}</td>
              <td className="py-2 pl-2 text-sm text-right font-semibold text-ink">{rupiah(r.omzet)}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      <TableCard title="Rekap per Karyawan" icon={<Users className="h-4 w-4 text-brand" />}>
        <thead>
          <tr className="text-left text-xs font-bold text-muted uppercase">
            <th className="py-2 pr-2">Karyawan</th>
            <th className="py-2 px-2 text-right">Jumlah</th>
            <th className="py-2 pl-2 text-right">Omzet</th>
          </tr>
        </thead>
        <tbody>
          {perKaryawan.map((r) => (
            <tr key={r.karyawan} className="border-t border-line">
              <td className="py-2 pr-2 text-sm font-semibold text-ink">{r.karyawan}</td>
              <td className="py-2 px-2 text-sm text-right text-ink">{r.jumlah}</td>
              <td className="py-2 pl-2 text-sm text-right font-semibold text-ink">{rupiah(r.omzet)}</td>
            </tr>
          ))}
          {perKaryawan.length === 0 && (
            <tr><td colSpan={3} className="py-4 text-center text-sm text-muted">Tidak ada data</td></tr>
          )}
        </tbody>
      </TableCard>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-base">Rekap kas harian</CardTitle>
        {cashShift ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted">Tanggal</span>
            <span className="text-right font-semibold text-ink">{cashShift.date}</span>
            <span className="text-muted">Dibuka oleh</span>
            <span className="text-right font-semibold text-ink">{cashShift.openedByName}</span>
            <span className="text-muted">Saldo awal</span>
            <span className="text-right font-semibold text-ink">{rupiah(cashShift.openingCash)}</span>
            <span className="text-muted">Kas seharusnya</span>
            <span className="text-right font-semibold text-ink">
              {cashShift.expectedCash === null ? "-" : rupiah(cashShift.expectedCash)}
            </span>
            <span className="text-muted">Kas akhir</span>
            <span className="text-right font-semibold text-ink">
              {cashShift.closingCash === null ? "Shift masih terbuka" : rupiah(cashShift.closingCash)}
            </span>
            <span className="text-muted">Selisih</span>
            <span className={cn("text-right font-semibold", (cashShift.difference ?? 0) < 0 ? "text-danger" : "text-ink")}>
              {cashShift.difference === null ? "-" : rupiah(cashShift.difference)}
            </span>
            <span className="text-muted">Status</span>
            <span className="text-right font-semibold text-ink">
              {cashShift.closedAt ? `Ditutup oleh ${cashShift.closedByName ?? "kasir"}` : "Terbuka"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">Belum ada shift kas. Buka shift di halaman Pengaturan → Gaji Kas.</p>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-ink">{label}</label>}
      {children}
    </div>
  );
}

function TableCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">{children}</table>
      </div>
    </Card>
  );
}
