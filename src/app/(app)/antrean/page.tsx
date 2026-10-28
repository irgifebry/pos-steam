"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  Clock,
  Droplets,
  Hash,
  Motorbike,
  Play,
  Receipt,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
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
  customerName: string;
  status: Status;
  entryTime: Date;
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

function makeDemoOrders(): Order[] {
  const now = Date.now();
  const min = (n: number) => n * 60 * 1000;
  const rows: (Omit<Order, "entryTime"> & { agoMin: number })[] = [
    {
      id: "1",
      queueNo: "M-001",
      plate: "B 1234 ABC",
      vehicleType: "motor",
      packageName: "Cuci + Semir",
      packagePrice: 35000,
      customerName: "Pak Budi",
      status: "proses",
      estimatedMin: 15,
      agoMin: 8,
    },
    {
      id: "2",
      queueNo: "C-001",
      plate: "D 5678 EFG",
      vehicleType: "mobil",
      packageName: "Cuci Premium",
      packagePrice: 75000,
      customerName: "Bu Sari",
      status: "menunggu",
      estimatedMin: 30,
      agoMin: 3,
    },
    {
      id: "3",
      queueNo: "M-002",
      plate: "F 9012 HIJ",
      vehicleType: "motor",
      packageName: "Cuci Reguler",
      packagePrice: 25000,
      customerName: "Mas Andi",
      status: "menunggu",
      estimatedMin: 12,
      agoMin: 1,
    },
    {
      id: "4",
      queueNo: "C-002",
      plate: "B 3456 KLM",
      vehicleType: "mobil",
      packageName: "Cuci + Wax",
      packagePrice: 90000,
      customerName: "Ibu Ratna",
      status: "selesai",
      estimatedMin: 35,
      agoMin: 42,
    },
    {
      id: "5",
      queueNo: "M-003",
      plate: "E 7890 NOP",
      vehicleType: "motor",
      packageName: "Cuci Reguler",
      packagePrice: 25000,
      customerName: "Kak Rizky",
      status: "selesai",
      estimatedMin: 12,
      agoMin: 55,
    },
    {
      id: "6",
      queueNo: "C-003",
      plate: "A 2468 QRS",
      vehicleType: "mobil",
      packageName: "Cuci Premium",
      packagePrice: 75000,
      customerName: "Pak Hendra",
      status: "proses",
      estimatedMin: 30,
      agoMin: 18,
    },
    {
      id: "7",
      queueNo: "M-004",
      plate: "H 1357 TUV",
      vehicleType: "motor",
      packageName: "Cuci + Semir",
      packagePrice: 35000,
      customerName: "Bu Lina",
      status: "menunggu",
      estimatedMin: 15,
      agoMin: 0.5,
    },
  ];

  return rows.map((r) => {
    const { agoMin, ...rest } = r;
    return { ...rest, entryTime: new Date(now - min(agoMin)) };
  });
}

export default function AntreanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("semua");
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const init = setTimeout(() => {
      setOrders(makeDemoOrders());
      setNow(Date.now());
    }, 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(init);
      clearInterval(t);
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

  function updateStatus(id: string, next: Status) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
  }

  function handleBayar(id: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "paid" } : o)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Antrean</h1>
        <p className="text-sm text-muted">Pantau cuci yang sedang berjalan hari ini</p>
      </div>

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
      {visible.length === 0 ? (
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
              onMulai={() => updateStatus(order.id, "proses")}
              onSelesai={() => updateStatus(order.id, "selesai")}
              onBayar={() => handleBayar(order.id)}
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
  onMulai,
  onSelesai,
  onBayar,
}: {
  order: Order;
  now: number;
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
          <Button variant="primary" size="md" fullWidth onClick={onMulai}>
            <Play className="h-4 w-4" /> Mulai
          </Button>
        )}
        {order.status === "proses" && (
          <Button variant="accent" size="md" fullWidth onClick={onSelesai}>
            <CheckCircle2 className="h-4 w-4" /> Selesai
          </Button>
        )}
        {order.status === "selesai" && (
          <Button variant="primary" size="md" fullWidth onClick={onBayar}>
            <Wallet className="h-4 w-4" /> Bayar
          </Button>
        )}
      </div>
    </Card>
  );
}
