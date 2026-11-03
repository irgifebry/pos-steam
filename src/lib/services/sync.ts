import { and, eq, sql } from "drizzle-orm";
import { orders } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import type { SessionUser } from "@/lib/auth/session";
import type { SyncBatch } from "@/lib/types";
import { getOutlet } from "./outlets";
import { listServicePackages } from "./service-packages";
import { listAddons } from "./addons";
import { listBanks } from "./banks";
import { listUserSummaries } from "./users";
import {
  addOrderPayment,
  createOrder,
  getOrder,
  jakartaDate,
  updateOrderStatus,
} from "./orders";

export async function getSyncBootstrap(db: AppDatabase, outletId: string) {
  const [outlet, packages, addons, banks, users] = await Promise.all([
    getOutlet(db, outletId),
    listServicePackages(db, outletId, { includeInactive: false }),
    listAddons(db, outletId, { includeInactive: false }),
    listBanks(db, outletId, { includeInactive: false }),
    listUserSummaries(db, outletId),
  ]);

  const businessDate = jakartaDate();

  const [invoiceRow] = await db
    .select({ maxInvoice: sql<string | null>`max(${orders.invoiceNo})` })
    .from(orders)
    .where(and(eq(orders.outletId, outletId), eq(orders.businessDate, businessDate)));

  const lastInvoiceSeq = invoiceRow?.maxInvoice
    ? Number(invoiceRow.maxInvoice.slice(-3)) || 0
    : 0;

  const [queueMotor] = await db
    .select({ maxQueue: sql<number | null>`max(${orders.queueSeq})` })
    .from(orders)
    .where(
      and(
        eq(orders.outletId, outletId),
        eq(orders.businessDate, businessDate),
        eq(orders.vehicleType, "motor"),
      ),
    );

  const [queueMobil] = await db
    .select({ maxQueue: sql<number | null>`max(${orders.queueSeq})` })
    .from(orders)
    .where(
      and(
        eq(orders.outletId, outletId),
        eq(orders.businessDate, businessDate),
        eq(orders.vehicleType, "mobil"),
      ),
    );

  return {
    outlet,
    packages,
    addons,
    banks,
    users,
    todayCounters: {
      date: businessDate,
      lastInvoiceSeq,
      lastQueueSeqMotor: Number(queueMotor?.maxQueue ?? 0),
      lastQueueSeqMobil: Number(queueMobil?.maxQueue ?? 0),
    },
    serverTime: new Date().toISOString(),
  };
}

export async function processSyncBatch(
  db: AppDatabase,
  outletId: string,
  actor: SessionUser,
  batch: SyncBatch,
) {
  const results: Array<{
    type: string;
    clientId?: string;
    orderId?: string;
    success: boolean;
    data?: unknown;
    error?: { code: string; message: string };
  }> = [];

  for (const item of batch.items) {
    try {
      if (item.type === "order.create") {
        const order = await createOrder(db, outletId, actor, {
          ...item.payload,
          clientId: item.clientId,
        });
        results.push({
          type: item.type,
          clientId: item.clientId,
          orderId: order.id,
          success: true,
          data: order,
        });
      } else if (item.type === "order.status") {
        const order = await updateOrderStatus(
          db,
          item.orderId,
          outletId,
          actor,
          item.payload,
        );
        results.push({
          type: item.type,
          orderId: order.id,
          success: true,
          data: order,
        });
      } else if (item.type === "order.payment") {
        const order = await addOrderPayment(
          db,
          item.orderId,
          outletId,
          actor,
          item.payload,
        );
        results.push({
          type: item.type,
          orderId: order.id,
          success: true,
          data: order,
        });
      }
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        // Jika status konflik tapi idempotent (misal order sudah status tersebut / already paid)
        results.push({
          type: item.type,
          clientId: "clientId" in item ? item.clientId : undefined,
          orderId: "orderId" in item ? item.orderId : undefined,
          success: false,
          error: { code: err.code, message: err.message },
        });
      } else {
        results.push({
          type: item.type,
          clientId: "clientId" in item ? item.clientId : undefined,
          orderId: "orderId" in item ? item.orderId : undefined,
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Kesalahan server",
          },
        });
      }
    }
  }

  return {
    processed: results.length,
    results,
  };
}
