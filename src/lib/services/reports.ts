import type { AppDatabase } from "@/lib/db/schema";
import type { VehicleType } from "@/lib/types";
import { jakartaDate, listOrders } from "./orders";

export type ReportTransaction = {
  id: string;
  invoiceNo: string;
  date: string;
  queueNo: string;
  vehicleType: VehicleType;
  paymentMethod: "Tunai" | "Transfer";
  packageName: string;
  addons: { name: string; price: number; qty: number; subtotal: number }[];
  admin: string;
  total: number;
  customerName: string;
  plate: string;
};

export type TodayDashboardView = {
  date: string;
  totalRevenue: number;
  totalTransactions: number;
  averageTicket: number;
  cashRevenue: number;
  transferRevenue: number;
  motorCount: number;
  mobilCount: number;
};

export type OmzetReportItem = {
  period: string;
  revenue: number;
  count: number;
  cash: number;
  transfer: number;
};

export type OmzetReport = {
  totalRevenue: number;
  totalTransactions: number;
  items: OmzetReportItem[];
};

export async function listReportTransactions(
  db: AppDatabase,
  outletId: string,
  from: string,
  to: string,
  opts: { vehicleType?: VehicleType; paymentMethod?: "Tunai" | "Transfer" } = {},
): Promise<ReportTransaction[]> {
  const rows = await listOrders(db, {
    outletId,
    from,
    to,
    includePaid: true,
    limit: 1000,
  });

  return rows
    .filter((order) => order.paid)
    .filter((order) => (opts.vehicleType ? order.vehicleType === opts.vehicleType : true))
    .map((order) => {
      const paymentMethod: "Tunai" | "Transfer" =
        order.payment?.method === "transfer" ? "Transfer" : "Tunai";
      return {
        id: order.id,
        invoiceNo: order.invoiceNo,
        date: order.businessDate,
        queueNo: order.queueNo,
        vehicleType: order.vehicleType,
        paymentMethod,
        packageName: order.packageName,
        addons: order.addons.map((addon) => ({
          name: addon.name,
          price: addon.price,
          qty: addon.qty,
          subtotal: addon.subtotal,
        })),
        admin: order.createdByName,
        total: order.grandTotal,
        customerName: order.customerName,
        plate: order.plate,
      };
    })
    .filter((r) => (opts.paymentMethod ? r.paymentMethod === opts.paymentMethod : true))
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
}

export async function getTodayDashboard(
  db: AppDatabase,
  outletId: string,
): Promise<TodayDashboardView> {
  const today = jakartaDate();
  const transactions = await listReportTransactions(db, outletId, today, today);

  const totalTransactions = transactions.length;
  let totalRevenue = 0;
  let cashRevenue = 0;
  let transferRevenue = 0;
  let motorCount = 0;
  let mobilCount = 0;

  for (const t of transactions) {
    totalRevenue += t.total;
    if (t.paymentMethod === "Tunai") {
      cashRevenue += t.total;
    } else {
      transferRevenue += t.total;
    }
    if (t.vehicleType === "mobil") {
      mobilCount += 1;
    } else {
      motorCount += 1;
    }
  }

  const averageTicket =
    totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  return {
    date: today,
    totalRevenue,
    totalTransactions,
    averageTicket,
    cashRevenue,
    transferRevenue,
    motorCount,
    mobilCount,
  };
}

export async function getOmzetReport(
  db: AppDatabase,
  outletId: string,
  from: string,
  to: string,
  groupBy: "day" | "week" | "month" = "day",
): Promise<OmzetReport> {
  const transactions = await listReportTransactions(db, outletId, from, to);

  const groups = new Map<string, OmzetReportItem>();

  for (const t of transactions) {
    let key = t.date;
    if (groupBy === "month") {
      key = t.date.slice(0, 7);
    } else if (groupBy === "week") {
      // Minggu dimulai dari hari Senin
      const d = new Date(t.date);
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() - day + 1);
      key = d.toISOString().slice(0, 10);
    }

    const current = groups.get(key) ?? {
      period: key,
      revenue: 0,
      count: 0,
      cash: 0,
      transfer: 0,
    };

    current.revenue += t.total;
    current.count += 1;
    if (t.paymentMethod === "Tunai") {
      current.cash += t.total;
    } else {
      current.transfer += t.total;
    }
    groups.set(key, current);
  }

  const items = Array.from(groups.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );

  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactions = items.reduce((sum, item) => sum + item.count, 0);

  return {
    totalRevenue,
    totalTransactions,
    items,
  };
}
