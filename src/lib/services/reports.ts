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
  employee: string;
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
        employee: order.createdByName,
        total: order.grandTotal,
        customerName: order.customerName,
        plate: order.plate,
      };
    })
    .filter((r) => (opts.paymentMethod ? r.paymentMethod === opts.paymentMethod : true))
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
}
