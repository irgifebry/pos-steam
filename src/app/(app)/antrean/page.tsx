"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  Clock,
  Droplets,
  Motorbike,
  Play,
  Receipt,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api-client";
import { formatWaktu, rupiah } from "@/lib/format";

type VehicleType = "motor" | "mobil";
type Status = "menunggu" | "proses" | "selesai" | "paid";

type Order = {
  id: string;
  queueNo: string;
  plate: string;
  vehicleType: VehicleType;
  packageName: string;
  packagePrice: number;
  total: number;
  customerName: string;
  status: Status;
  entryTime: Date;
  estimatedMin: number;
};

type ApiOrder = {
  id: string;
  queueNo: string;
  plate: string;
  vehicleType: VehicleType;
  packageName: string;
  packagePrice: number;
  grandTotal: number;
  customerName: string;
  status: Status;
  createdAt: string;
  estimatedMin: number;
};

const FILTERS = ["semua", "motor", "mobil"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  semua: "Semua",
  motor: "Motor",
  mobil: "Mobil",
};

const STATUS_META: Record<
  Exclude<Status, "paid">,
  { label: string; tone: "accent" | "info" | "success"; color: string; dot: string }
> = {
  menunggu: {
    label: "Menunggu",
    tone: "accent",
    color: "text-amber-700",
    dot: "bg-accent",
  },
  proses: {
    label: "Sedang dicuci",
    tone: "info",
    color: "text-info",
    dot: "bg-info",
  },
  selesai: {
    label: "Selesai (belum bayar)",
    tone: "success",
    color: "text-success",
    dot: "bg-success",
  },
};

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} menit ${s.toString().padStart(2, "0")} detik`;
}

export default function AntreanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("semua");
  const [now, setNow] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ data: ApiOrder[] }>("/api/orders?includePaid=false");
      setOrders(
        res.data.map((order) => ({
          id: order.id,
          queueNo: order.queueNo,
          plate: order.plate,
          vehicleType: order.vehicleType,
          packageName: order.packageName,
          packagePrice: order.packagePrice,
          total: order.grandTotal,
          customerName: order.customerName,
          status: order.status,
          entryTime: new Date(order.createdAt),
          estimatedMin: order.estimatedMin,
        })),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat antrean");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 5_000);
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, []);

  const counts = useMemo(() => {
    const waiting = orders.filter((o) => o.status === "menunggu").length;
    const washing = orders.filter((o) => o.status === "proses").length;
    const doneUnpaid = orders.filter((o) => o.status === "selesai").length;
    const totalToday = orders.length;
    return { waiting, washing, doneUnpaid, totalToday };
  }, [orders]);

  const visible = useMemo(() => {
    return orders
      .filter((o) => o.status !== "paid")
      .filter((o) => filter === "semua" || o.vehicleType === filter)
      .sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
  }, [orders, filter]);

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
    } finally {
      setBusyId(null);
    }
  }

  async function handleBayar(order: Order) {
    setBusyId(order.id);
    try {
      await apiFetch(`/api/orders/${order.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ method: "tunai", cashReceived: order.total }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Antrean</h1>
        <p className="text-sm text-muted">Pantau cuci yang sedang berjalan hari ini</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl bg-surface px-4 py-3 border border-line">
        <SummaryCard
          icon={Clock}
          label="Menunggu"
          value={counts.waiting}
          tone="accent"
        />
        <SummaryCard
          icon={Droplets}
          label="Sedang dicuci"
          value={counts.washing}
          tone="info"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Selesai belum bayar"
          value={counts.doneUnpaid}
          tone="success"
        />
        <SummaryCard
          icon={Receipt}
          label="Total hari ini"
          value={counts.totalToday}
          tone="brand"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
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
        <Card className="py-10 text-center text-sm text-muted">Memuat antrean...</Card>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center text-center gap-3 py-10">
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
              onBayar={() => handleBayar(order)}
            />
          ))}
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
  tone: "accent" | "info" | "success" | "brand";
}) {
  const toneClass = {
    accent: "bg-accent-soft text-amber-700",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    brand: "bg-brand-soft text-brand",
  }[tone];

  return (
    <div className="flex items-center gap-3 py-1">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", toneClass.split(" ")[1])}>{label}</p>
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
  order: Order;
  now: number;
  busy: boolean;
  onMulai: () => void;
  onSelesai: () => void;
  onBayar: () => void;
}) {
  const meta = STATUS_META[order.status as Exclude<Status, "paid">];
  const elapsed = formatElapsed(now - order.entryTime.getTime());
  const overEstimate =
    now - order.entryTime.getTime() > order.estimatedMin * 60 * 1000;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* Queue number big */}
        <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-xl bg-brand-soft text-brand shrink-0">
          <span className="text-xs font-semibold leading-none">Antrean</span>
          <span className="font-display text-sm font-bold leading-none mt-1">
            {order.queueNo}
          </span>
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
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", meta.dot)} />
              {meta.label}
            </Badge>
          </div>
          <p className="text-sm text-muted mt-1 truncate">
            {order.packageName} · {rupiah(order.packagePrice)}
          </p>
          <p className="text-sm text-ink font-medium mt-0.5 truncate">
            {order.customerName}
          </p>
        </div>
      </div>

      {/* Timer + estimate */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse", meta.dot)} />
          <div className="min-w-0">
            <p className="text-xs text-muted leading-none">Berjalan</p>
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
            mulai {formatWaktu(order.entryTime)}
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
            <Wallet className="h-4 w-4" /> {busy ? "Menyimpan..." : "Bayar"}
          </Button>
        )}
      </div>
    </Card>
  );
}
