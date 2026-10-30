"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Car, CheckCircle2, Clock, Droplets, Motorbike, Play, Receipt, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useAppSession } from "@/components/SessionProvider";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatTanggal, formatWaktu, rupiah } from "@/lib/format";
import type { VehicleType } from "@/lib/types";

type BoardStatus = "menunggu" | "proses" | "selesai" | "paid" | "dibatalkan";

type BoardOrder = {
  id: string;
  queueNo: string;
  vehicleType: VehicleType;
  status: BoardStatus;
  customerName: string;
  customerPhone: string;
  plate: string;
  packageName: string;
  packagePrice: number;
  grandTotal: number;
  createdAt: string;
  startedAt: string | null;
  estimatedMin: number;
};

type BoardSummary = {
  menunggu: number;
  proses: number;
  selesai: number;
  total: number;
};

type BoardResponse = {
  data: {
    orders: BoardOrder[];
    summary: BoardSummary;
  };
};

type Filter = "semua" | "motor" | "mobil";

const FILTERS: Filter[] = ["semua", "motor", "mobil"];
const FILTER_LABEL: Record<Filter, string> = {
  semua: "Semua",
  motor: "Motor",
  mobil: "Mobil",
};

const STATUS_META: Record<
  BoardStatus,
  { label: string; tone: "brand" | "accent" | "success" | "danger" | "muted" | "info"; dotBg: string }
> = {
  menunggu: { label: "Menunggu", tone: "info", dotBg: "bg-info" },
  proses: { label: "Sedang dicuci", tone: "accent", dotBg: "bg-accent text-ink" },
  selesai: { label: "Selesai (belum bayar)", tone: "success", dotBg: "bg-success" },
  paid: { label: "Lunas", tone: "brand", dotBg: "bg-brand" },
  dibatalkan: { label: "Dibatalkan", tone: "muted", dotBg: "bg-ink text-white" },
};

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AntreanPage() {
  const { role } = useAppSession();
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [summary, setSummary] = useState<BoardSummary>({ menunggu: 0, proses: 0, selesai: 0, total: 0 });
  const [filter, setFilter] = useState<Filter>("semua");
  const [now, setNow] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payOrder, setPayOrder] = useState<BoardOrder | null>(null);
  const [payMethod, setPayMethod] = useState<"tunai" | "transfer">("tunai");
  const [cashReceived, setCashReceived] = useState("");
  const [refNo, setRefNo] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [banks, setBanks] = useState<{ id: string; name: string; accountNumber: string }[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const refreshing = useRef(false);
  const hasLoadedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const res = await apiFetch<BoardResponse>("/api/board");
      setOrders(res.data.orders);
      setSummary(res.data.summary);
      setError("");
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat papan antrean");
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    (async () => {
      try {
        const res = await apiFetch<{ data: { id: string; name: string; accountNumber: string }[] }>("/api/banks");
        setBanks(res?.data ?? []);
      } catch {
        setBanks([]);
      }
    })();
    const poll = window.setInterval(() => void load(), 5_000);
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  const visible = useMemo(() => {
    return orders
      .filter((o) => o.status !== "paid")
      .filter((o) => filter === "semua" || o.vehicleType === filter)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [orders, filter]);

  const cashAmount = Number((cashReceived || "").replace(/\\D/g, ""));
  const change = payOrder ? cashAmount - payOrder.grandTotal : NaN;

  const counts = useMemo(() => {
    const cancelled = orders.filter((o) => o.status === "dibatalkan").length;
    return {
      waiting: summary.menunggu,
      washing: summary.proses,
      doneUnpaid: summary.selesai,
      totalToday: Math.max(0, summary.total - cancelled),
    };
  }, [summary, orders]);

  async function updateStatus(id: string, next: "proses" | "selesai") {
    setBusyId(id);
    try {
      await apiFetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui status");
      showToast(err instanceof Error ? err.message : "Gagal memperbarui status");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay() {
    if (!payOrder) return;
    if (payMethod === "transfer") {
      if (!selectedBankId) {
        showToast("Pilih bank dulu ya");
        return;
      }
      if (!refNo.trim()) {
        showToast("Nomor referensi transfer wajib diisi");
        return;
      }
    }
    if (payMethod === "tunai") {
      const cashNum = Number((cashReceived || "").replace(/\D/g, "")) || 0;
      if (cashNum < payOrder.grandTotal) {
        showToast("Uang diterima kurang");
        return;
      }
    }
    setPayLoading(true);
    try {
      const body: {
        method: "tunai" | "transfer";
        cashReceived?: number;
        bankId?: string;
        referenceNo?: string;
      } = {
        method: payMethod,
      };
      if (payMethod === "tunai") {
        const cashNum = Number((cashReceived || "").replace(/\D/g, "")) || 0;
        body.cashReceived = cashNum;
      } else {
        body.bankId = selectedBankId;
        body.referenceNo = refNo.trim();
      }

      await apiFetch(`/api/orders/${payOrder.id}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setPayOrder(null);
      setPayMethod("tunai");
      setCashReceived("");
      setRefNo("");
      setSelectedBankId("");
      showToast("Pembayaran diterima");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
      showToast(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
    } finally {
      setPayLoading(false);
    }
  }

  useEffect(() => {
    if (!payOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !payLoading) setPayOrder(null);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const el = document.querySelector('[role="dialog"] input, [role="dialog"] select') as HTMLElement | null;
      el?.focus();
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [payOrder, payLoading]);

  return (
    <div className="flex flex-col gap-4 pb-36">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Antrean</h1>
        <p className="text-sm text-muted flex items-center gap-2 mt-1">
          {formatTanggal(new Date())}
          <span className="bg-surface border border-line px-2 py-0.5 rounded-md text-xs font-semibold text-ink">
            Posisi: {role}
          </span>
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl bg-surface px-4 py-3 border border-line">
        <SummaryCard icon={Clock} label="Menunggu" value={counts.waiting} tone="info" />
        <SummaryCard icon={Droplets} label="Sedang dicuci" value={counts.washing} tone="accent" />
        <SummaryCard icon={CheckCircle2} label="Selesai belum bayar" value={counts.doneUnpaid} tone="success" />
        <SummaryCard icon={Receipt} label="Total hari ini" value={counts.totalToday} tone="brand" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition active:scale-[0.98]",
              filter === f
                ? "bg-ink text-white border-ink"
                : "bg-surface text-muted border-line hover:text-ink",
            )}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Card className="py-12 text-center text-sm text-muted">
          <Spinner className="text-brand mx-auto mb-3" /> Memuat antrean...
        </Card>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center text-center gap-3 py-12">
          <div className="h-16 w-16 rounded-full bg-brand-soft text-brand flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <p className="font-bold text-ink text-lg">Belum ada antrean</p>
            <p className="text-sm text-muted mt-1">
              Semua kendaraan sudah selesai. Antrean baru akan muncul di sini.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => (
            <QueueCard
              key={order.id}
              order={order}
              now={now}
              busy={busyId === order.id}
              onMulai={() => updateStatus(order.id, "proses")}
              onSelesai={() => updateStatus(order.id, "selesai")}
              onBayar={() => setPayOrder(order)}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2 rounded-full shadow-[var(--shadow-float)] text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* Modal pembayaran */}
      {payOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={() => {
            if (!payLoading) setPayOrder(null);
          }}
        >
          <Card className="w-full max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand" />
              <h2 id="pay-modal-title" className="font-bold text-ink">Pembayaran {payOrder.queueNo}</h2>
            </div>
            <p className="text-sm text-muted">
              {payOrder.customerName} • {payOrder.plate}
            </p>
            <div className="border-y border-line py-2">
              <p className="text-sm text-muted">Total</p>
              <p className="font-display text-xl font-bold text-ink tabular-nums">{rupiah(payOrder.grandTotal)}</p>
            </div>
            <Field label="Metode pembayaran">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod("tunai")}
                  className={cn(
                    "h-12 rounded-lg border flex items-center justify-center gap-2 font-semibold transition",
                    payMethod === "tunai" ? "bg-accent text-ink border-accent" : "bg-surface text-ink border-line hover:bg-accent-soft",
                  )}
                >
                  Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod("transfer")}
                  className={cn(
                    "h-12 rounded-lg border flex items-center justify-center gap-2 font-semibold transition",
                    payMethod === "transfer" ? "bg-accent text-ink border-accent" : "bg-surface text-ink border-line hover:bg-accent-soft",
                  )}
                >
                  Transfer
                </button>
              </div>
            </Field>
            {payMethod === "tunai" ? (
              <Card className="flex flex-col gap-3 p-3 bg-surface">
                <Field label="Uang diterima">
                  <Input
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    inputMode="numeric"
                    className="h-12 text-base"
                    aria-invalid={cashReceived !== "" && !Number.isFinite(cashAmount)}
                  />
                </Field>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Kembalian</span>
                  <span className="text-lg font-extrabold text-success">
                    {Number.isFinite(change) && cashReceived.trim() !== ""
                      ? rupiah(Math.max(0, change))
                      : "—"}
                  </span>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                <Field label="Pilih bank">
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                    aria-label="Pilih bank"
                  >
                    <option value="">-- Pilih bank --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} - {b.accountNumber}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nomor referensi transfer">
                  <Input
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="Nomor referensi transfer"
                    className="h-12 text-base"
                    aria-invalid={refNo.trim() === ""}
                  />
                </Field>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setPayOrder(null)}
                disabled={payLoading}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handlePay}
                disabled={payLoading}
              >
                {payLoading ? (
                  <>
                    <Spinner className="text-white h-4 w-4" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Bayar
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "brand" | "accent" | "success" | "info";
}) {
  const toneClass: Record<string, string> = {
    brand: "bg-brand-soft text-brand",
    accent: "bg-accent-soft text-amber-800",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClass[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", toneClass[tone].split(" ")[1])}>{label}</p>
        <p className="font-display text-3xl font-bold text-ink leading-none mt-1 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function QueueCard({
  order,
  now,
  busy,
  onMulai,
  onSelesai,
  onBayar,
}: {
  order: BoardOrder;
  now: number;
  busy: boolean;
  onMulai: () => void;
  onSelesai: () => void;
  onBayar: () => void;
}) {
  const meta = STATUS_META[order.status];
  const baseAt = order.startedAt ?? order.createdAt;
  const elapsed = formatElapsed(now - new Date(baseAt).getTime());
  const overEstimate = now - new Date(baseAt).getTime() > order.estimatedMin * 60 * 1000;
  const running = order.status === "menunggu" || order.status === "proses";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* Queue number big */}
        <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-xl bg-brand-soft text-brand shrink-0">
          <span className="text-xs font-semibold leading-none">Antrean</span>
          <span className="font-display text-sm font-bold leading-none mt-1">{order.queueNo}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink text-base">{order.plate}</span>
            <Badge tone={order.vehicleType === "motor" ? "muted" : "info"}>
              {order.vehicleType === "motor" ? (
                <Motorbike className="h-3 w-3 mr-1" />
              ) : (
                <Car className="h-3 w-3 mr-1" />
              )}
              {order.vehicleType === "motor" ? "Motor" : "Mobil"}
            </Badge>
            <Badge tone={meta.tone}>
              <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${meta.dotBg}`} />
              {meta.label}
            </Badge>
          </div>
          <p className="text-sm text-muted mt-1 truncate">
            {order.packageName} · {rupiah(order.packagePrice)}
          </p>
          <p className="text-sm text-ink font-medium mt-0.5 truncate">{order.customerName}</p>
          {order.customerPhone && (
            <p className="text-[12px] text-muted truncate">{order.customerPhone}</p>
          )}
        </div>
      </div>

      {/* Timer + estimate */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full ${running ? "animate-pulse" : ""} ${meta.dotBg}`} />
          <div className="min-w-0">
            <p className="text-xs text-muted leading-none">{running ? "Berjalan sejak masuk" : meta.label}</p>
            <p className="font-display font-bold text-ink text-base leading-tight mt-0.5 tabular-nums">
              {elapsed}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted leading-none">Estimasi</p>
          <p
            className={cn(
              "font-semibold text-sm leading-tight mt-0.5",
              overEstimate ? "text-danger" : "text-ink",
            )}
          >
            {order.estimatedMin} menit
          </p>
          <p className="text-[11px] text-muted leading-none mt-0.5">
            mulai {formatWaktu(baseAt)}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {order.status === "menunggu" && (
          <Button variant="primary" size="md" fullWidth onClick={onMulai} disabled={busy}>
            <Play className="h-4 w-4" /> {busy ? "Memproses..." : "Mulai"}
          </Button>
        )}
        {order.status === "proses" && (
          <Button variant="accent" size="md" fullWidth onClick={onSelesai} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> {busy ? "Menyimpan..." : "Selesai"}
          </Button>
        )}
        {order.status === "selesai" && (
          <Button variant="primary" size="md" fullWidth onClick={onBayar} disabled={busy}>
            <Wallet className="h-4 w-4" /> {busy ? "Memproses..." : "Bayar"}
          </Button>
        )}
      </div>
    </Card>
  );
}
