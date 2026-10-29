import type { AppDatabase } from "@/lib/db/schema";
import type { VehicleType } from "@/lib/types";
import { listOrders } from "./orders";

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

export async function listReportTransactions(
  db: AppDatabase,
  outletId: string,
  from: string,
  to: string,
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
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
}
