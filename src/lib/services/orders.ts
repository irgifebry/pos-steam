import { and, asc, desc, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import {
  addons,
  auditLogs,
  banks,
  customers,
  orderItems,
  orders,
  outlets,
  payments,
  servicePackages,
  user as userTable,
  vehicles,
} from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError, isUniqueViolation } from "@/lib/http";
import {
  orderCancelSchema,
  orderCreateSchema,
  orderPaymentInputSchema,
  orderStatusSchema,
} from "@/lib/schemas";
import type {
  OrderCancel,
  OrderCreate,
  OrderPaymentInput,
  OrderStatusUpdate,
  VehicleType,
} from "@/lib/types";
import type { SessionUser } from "@/lib/auth/session";

export type OrderItemView = {
  id: string;
  kind: string;
  refId: string | null;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
};

export type OrderPaymentView = {
  id: string;
  method: string;
  amount: number;
  tender: number | null;
  changeAmount: number | null;
  bank: string | null;
  referenceNo: string | null;
  verifiedAt: Date | null;
};

export type OrderView = {
  id: string;
  invoiceNo: string;
  businessDate: string;
  queueNo: string;
  queueSeq: number;
  queuePrefix: string;
  vehicleType: VehicleType;
  status: string;
  customerName: string;
  customerPhone: string;
  plate: string;
  total: number;
  tax: number;
  grandTotal: number;
  discount: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  cancelledReason: string | null;
  packageName: string;
  packagePrice: number;
  estimatedMin: number;
  addons: OrderItemView[];
  payment: OrderPaymentView | null;
  paid: boolean;
  createdBy: string;
  createdByName: string;
};

export type ReceiptView = {
  order: OrderView;
  outlet: {
    id: string;
    name: string;
    address: string;
    phone: string;
    receiptFooter: string;
    taxPercent: number;
  };
  cashierName: string;
};

type Tx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export function jakartaDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizePlate(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function toQueuePrefix(vehicleType: string): string {
  return vehicleType === "mobil" ? "C" : "M";
}

async function resolvePayment(
  db: AppDatabase | Tx,
  outletId: string,
  grandTotal: number,
  input: OrderPaymentInput,
  userId: string,
) {
  const data = orderPaymentInputSchema.parse(input);

  if (data.method === "tunai") {
    const tender = data.cashReceived ?? grandTotal;
    if (tender < grandTotal) {
      throw new HttpError(400, "VALIDATION_ERROR", "Uang diterima kurang dari total");
    }
    return {
      method: "tunai",
      amount: grandTotal,
      tender,
      changeAmount: tender - grandTotal,
      bank: null,
      referenceNo: null,
      verifiedBy: userId,
      verifiedAt: new Date(),
    };
  }

  if (!data.bankId) {
    throw new HttpError(400, "VALIDATION_ERROR", "Bank tujuan transfer wajib dipilih");
  }
  if (!data.referenceNo?.trim()) {
    throw new HttpError(400, "VALIDATION_ERROR", "Nomor referensi transfer wajib diisi");
  }

  const [bank] = await db
    .select()
    .from(banks)
    .where(
      and(
        eq(banks.id, data.bankId),
        eq(banks.outletId, outletId),
        eq(banks.active, true),
      ),
    )
    .limit(1);

  if (!bank) {
    throw new HttpError(400, "VALIDATION_ERROR", "Bank tujuan tidak ditemukan");
  }

  return {
    method: "transfer",
    amount: grandTotal,
    tender: null,
    changeAmount: null,
    bank: `${bank.name} - ${bank.accountNumber}`,
    referenceNo: data.referenceNo.trim(),
    verifiedBy: userId,
    verifiedAt: new Date(),
  };
}

async function saveCustomerAndVehicle(
  tx: Tx,
  input: OrderCreate,
): Promise<{
  customerId: string | null;
  vehicleId: string | null;
  customerName: string;
  customerPhone: string;
  plate: string;
}> {
  const plate = normalizePlate(input.plate);
  let customerName = input.customerName.trim();
  let customerPhone = input.customerPhone.trim();
  let customerId: string | null = null;
  let vehicleId: string | null = null;

  if (plate) {
    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.plate, plate))
      .limit(1);

    if (vehicle) {
      vehicleId = vehicle.id;
      customerId = vehicle.customerId;

      if (customerId) {
        const [customer] = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, customerId))
          .limit(1);

        if (customer) {
          customerName = customerName || customer.name;
          customerPhone = customerPhone || (customer.phone ?? "");
          if (
            (input.customerName.trim() && input.customerName.trim() !== customer.name) ||
            (input.customerPhone.trim() && input.customerPhone.trim() !== (customer.phone ?? ""))
          ) {
            await tx
              .update(customers)
              .set({
                name: customerName || customer.name,
                phone: customerPhone || null,
              })
              .where(eq(customers.id, customer.id));
          }
        }
      }

      if (vehicle.vehicleType !== input.vehicleType) {
        await tx
          .update(vehicles)
          .set({ vehicleType: input.vehicleType })
          .where(eq(vehicles.id, vehicle.id));
      }
    } else {
      if (!customerName) customerName = "Pelanggan";
      const [customer] = await tx
        .insert(customers)
        .values({ name: customerName, phone: customerPhone || null })
        .returning();
      customerId = customer.id;

      const [createdVehicle] = await tx
        .insert(vehicles)
        .values({
          customerId,
          plate,
          vehicleType: input.vehicleType,
        })
        .returning();
      vehicleId = createdVehicle.id;
    }
  } else if (customerName || customerPhone) {
    const [customer] = await tx
      .insert(customers)
      .values({ name: customerName || "Pelanggan", phone: customerPhone || null })
      .returning();
    customerId = customer.id;
  }

  return {
    customerId,
    vehicleId,
    customerName: customerName || "Pelanggan",
    customerPhone,
    plate,
  };
}

export async function listOrders(
  db: AppDatabase,
  opts: {
    outletId: string;
    from?: string;
    to?: string;
    includePaid?: boolean;
    limit?: number;
  },
): Promise<OrderView[]> {
  const filters = [
    eq(orders.outletId, opts.outletId),
    opts.from ? gte(orders.businessDate, opts.from) : undefined,
    opts.to ? lte(orders.businessDate, opts.to) : undefined,
    opts.includePaid ? undefined : notInArray(orders.status, ["paid", "dibatalkan"]),
  ].filter((filter) => filter !== undefined);

  const rows = await db
    .select()
    .from(orders)
    .where(and(...filters))
    .orderBy(desc(orders.createdAt))
    .limit(opts.limit ?? 200);

  return hydrateOrders(db, rows);
}

async function hydrateOrders(
  db: AppDatabase,
  rows: (typeof orders.$inferSelect)[],
): Promise<OrderView[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const creatorIds = [...new Set(rows.map((row) => row.createdBy))];

  const [items, paymentRows, creators] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, ids))
      .orderBy(asc(orderItems.createdAt)),
    db.select().from(payments).where(inArray(payments.orderId, ids)),
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(inArray(userTable.id, creatorIds)),
  ]);

  const packageIds = [
    ...new Set(
      items
        .filter((item) => item.kind === "package" && item.refId)
        .map((item) => item.refId as string),
    ),
  ];
  const packageRows =
    packageIds.length === 0
      ? []
      : await db
          .select({ id: servicePackages.id, durationMin: servicePackages.durationMin })
          .from(servicePackages)
          .where(inArray(servicePackages.id, packageIds));
  const durationById = new Map(packageRows.map((row) => [row.id, row.durationMin]));

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const paymentByOrder = new Map(paymentRows.map((row) => [row.orderId, row]));
  const nameById = new Map(creators.map((row) => [row.id, row.name]));

  return rows.map((row) => {
    const orderItemRows = itemsByOrder.get(row.id) ?? [];
    const packageItem = orderItemRows.find((item) => item.kind === "package");
    const payment = paymentByOrder.get(row.id);

    return {
      id: row.id,
      invoiceNo: row.invoiceNo,
      businessDate: row.businessDate,
      queueNo: `${row.queuePrefix}-${String(row.queueSeq).padStart(3, "0")}`,
      queueSeq: row.queueSeq,
      queuePrefix: row.queuePrefix,
      vehicleType: row.vehicleType as VehicleType,
      status: row.status,
      customerName: row.customerName ?? "Pelanggan",
      customerPhone: row.customerPhone ?? "",
      plate: row.plate ?? "",
      total: row.total,
      tax: row.tax,
      grandTotal: row.grandTotal,
      discount: row.discount,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      cancelledReason: row.cancelledReason,
      packageName: packageItem?.nameSnapshot ?? "Paket",
      packagePrice: packageItem?.priceSnapshot ?? 0,
      estimatedMin: packageItem?.refId ? (durationById.get(packageItem.refId) ?? 0) : 0,
      addons: orderItemRows
        .filter((item) => item.kind === "addon")
        .map((item) => ({
          id: item.id,
          kind: item.kind,
          refId: item.refId,
          name: item.nameSnapshot,
          price: item.priceSnapshot,
          qty: item.qty,
          subtotal: item.subtotal,
        })),
      payment: payment
        ? {
            id: payment.id,
            method: payment.method,
            amount: payment.amount,
            tender: payment.tender,
            changeAmount: payment.changeAmount,
            bank: payment.bank,
            referenceNo: payment.referenceNo,
            verifiedAt: payment.verifiedAt,
          }
        : null,
      paid: Boolean(payment),
      createdBy: row.createdBy,
      createdByName: nameById.get(row.createdBy) ?? "Kasir",
    };
  });
}

export async function getOrder(
  db: AppDatabase,
  orderId: string,
  outletId: string,
): Promise<OrderView> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.outletId, outletId)))
    .limit(1);

  if (!row) {
    throw new HttpError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
  }

  const [view] = await hydrateOrders(db, [row]);
  return view;
}

export async function createOrder(
  db: AppDatabase,
  outletId: string,
  actor: SessionUser,
  input: OrderCreate,
): Promise<OrderView> {
  if (!outletId) {
    throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
  }

  const data = orderCreateSchema.parse(input);

  if (data.clientId) {
    const [existing] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.clientId, data.clientId), eq(orders.outletId, outletId)))
      .limit(1);
    if (existing) return getOrder(db, existing.id, outletId);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const orderId = await db.transaction(async (tx) => {
        const [outlet] = await tx
          .select()
          .from(outlets)
          .where(eq(outlets.id, outletId))
          .limit(1);
        if (!outlet) {
          throw new HttpError(404, "NOT_FOUND", "Outlet tidak ditemukan");
        }

        const [pkg] = await tx
          .select()
          .from(servicePackages)
          .where(
            and(
              eq(servicePackages.id, data.packageId),
              eq(servicePackages.outletId, outletId),
              eq(servicePackages.active, true),
            ),
          )
          .limit(1);

        if (!pkg || pkg.vehicleType !== data.vehicleType) {
          throw new HttpError(400, "VALIDATION_ERROR", "Paket tidak tersedia untuk kendaraan ini");
        }

        const addonRows =
          data.addons.length === 0
            ? []
            : await tx
                .select()
                .from(addons)
                .where(
                  and(
                    inArray(
                      addons.id,
                      data.addons.map((item) => item.addonId),
                    ),
                    eq(addons.outletId, outletId),
                    eq(addons.active, true),
                  ),
                );

        const addonById = new Map(addonRows.map((row) => [row.id, row]));
        for (const line of data.addons) {
          const addon = addonById.get(line.addonId);
          if (!addon) {
            throw new HttpError(400, "VALIDATION_ERROR", "Add-on tidak ditemukan");
          }
          if (!addon.vehicleTypes.includes(data.vehicleType)) {
            throw new HttpError(400, "VALIDATION_ERROR", "Add-on tidak tersedia untuk kendaraan ini");
          }
        }

        const businessDate = jakartaDate();
        const queuePrefix = toQueuePrefix(data.vehicleType);
        const [queueRow] = await tx
          .select({ maxQueue: sql<number | null>`max(${orders.queueSeq})` })
          .from(orders)
          .where(
            and(
              eq(orders.outletId, outletId),
              eq(orders.businessDate, businessDate),
              eq(orders.vehicleType, data.vehicleType),
            ),
          );
        const queueSeq = Number(queueRow?.maxQueue ?? 0) + 1;

        const [invoiceRow] = await tx
          .select({ maxInvoice: sql<string | null>`max(${orders.invoiceNo})` })
          .from(orders)
          .where(
            and(
              eq(orders.outletId, outletId),
              eq(orders.businessDate, businessDate),
            ),
          );
        const invoiceSeq = invoiceRow?.maxInvoice
          ? Number(invoiceRow.maxInvoice.slice(-3)) + 1
          : 1;
        const invoiceNo = `S-${businessDate.replaceAll("-", "")}-${String(invoiceSeq).padStart(3, "0")}`;

        const customer = await saveCustomerAndVehicle(tx, data);

        const addonSubtotal = data.addons.reduce((sum, line) => {
          const addon = addonById.get(line.addonId);
          return sum + (addon ? addon.price * line.qty : 0);
        }, 0);
        const subtotal = pkg.price + addonSubtotal;
        const tax = Math.round((subtotal * Number(outlet.taxPercent)) / 100);
        const grandTotal = subtotal + tax;

        const payment = data.payment
          ? await resolvePayment(tx, outletId, grandTotal, data.payment, actor.id)
          : null;

        const [order] = await tx
          .insert(orders)
          .values({
            clientId: data.clientId ?? null,
            outletId,
            invoiceNo,
            businessDate,
            vehicleType: data.vehicleType,
            status: "menunggu",
            queueSeq,
            queuePrefix,
            customerId: customer.customerId,
            vehicleId: customer.vehicleId,
            customerName: customer.customerName,
            customerPhone: customer.customerPhone,
            plate: customer.plate,
            total: subtotal,
            tax,
            grandTotal,
            createdBy: actor.id,
          })
          .returning();

        await tx.insert(orderItems).values([
          {
            orderId: order.id,
            kind: "package",
            refId: pkg.id,
            nameSnapshot: pkg.name,
            priceSnapshot: pkg.price,
            qty: 1,
            subtotal: pkg.price,
          },
          ...data.addons.map((line) => {
            const addon = addonById.get(line.addonId)!;
            return {
              orderId: order.id,
              kind: "addon",
              refId: addon.id,
              nameSnapshot: addon.name,
              priceSnapshot: addon.price,
              qty: line.qty,
              subtotal: addon.price * line.qty,
            };
          }),
        ]);

        if (payment) {
          await tx.insert(payments).values({ orderId: order.id, ...payment });
        }

        await tx.insert(auditLogs).values({
          outletId,
          userId: actor.id,
          action: "order.create",
          entity: "order",
          entityId: order.id,
          after: {
            invoiceNo,
            queueNo: `${queuePrefix}-${String(queueSeq).padStart(3, "0")}`,
            grandTotal,
            paid: Boolean(payment),
          },
        });

        return order.id;
      });

      return getOrder(db, orderId, outletId);
    } catch (error) {
      if (data.clientId) {
        const [existing] = await db
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.clientId, data.clientId), eq(orders.outletId, outletId)))
          .limit(1);
        if (existing) return getOrder(db, existing.id, outletId);
      }
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }

  throw new HttpError(500, "INTERNAL_ERROR", "Gagal membuat nomor antrean");
}

export async function updateOrderStatus(
  db: AppDatabase,
  orderId: string,
  outletId: string,
  actor: SessionUser,
  input: OrderStatusUpdate,
): Promise<OrderView> {
  const data = orderStatusSchema.parse(input);
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.outletId, outletId)))
    .limit(1);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
  }
  if (order.status === "paid" || order.status === "dibatalkan") {
    throw new HttpError(409, "INVALID_STATUS", "Transaksi ini sudah selesai");
  }

  const allowed =
    (order.status === "menunggu" && data.status === "proses") ||
    (order.status === "proses" && data.status === "selesai");
  if (!allowed) {
    throw new HttpError(409, "INVALID_STATUS", "Perubahan status tidak valid");
  }

  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);

  const nextStatus =
    data.status === "selesai" && payment ? "paid" : data.status;

  await db
    .update(orders)
    .set({
      status: nextStatus,
      startedAt: data.status === "proses" ? new Date() : order.startedAt,
      finishedAt: data.status === "selesai" ? new Date() : order.finishedAt,
    })
    .where(eq(orders.id, orderId));

  await db.insert(auditLogs).values({
    outletId,
    userId: actor.id,
    action: "order.status",
    entity: "order",
    entityId: orderId,
    before: { status: order.status },
    after: { status: nextStatus },
  });

  return getOrder(db, orderId, outletId);
}

export async function addOrderPayment(
  db: AppDatabase,
  orderId: string,
  outletId: string,
  actor: SessionUser,
  input: OrderPaymentInput,
): Promise<OrderView> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.outletId, outletId)))
    .limit(1);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
  }
  if (order.status === "dibatalkan") {
    throw new HttpError(409, "INVALID_STATUS", "Transaksi sudah dibatalkan");
  }
  if (order.status !== "selesai") {
    throw new HttpError(409, "INVALID_STATUS", "Pembayaran hanya bisa setelah cuci selesai");
  }

  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);
  if (existing) {
    throw new HttpError(409, "ALREADY_PAID", "Transaksi sudah dibayar");
  }

  const payment = await resolvePayment(db, outletId, order.grandTotal, input, actor.id);

  await db.transaction(async (tx) => {
    await tx.insert(payments).values({ orderId, ...payment });
    await tx.update(orders).set({ status: "paid" }).where(eq(orders.id, orderId));
    await tx.insert(auditLogs).values({
      outletId,
      userId: actor.id,
      action: "order.payment",
      entity: "order",
      entityId: orderId,
      after: { method: payment.method, amount: payment.amount },
    });
  });

  return getOrder(db, orderId, outletId);
}

export async function cancelOrder(
  db: AppDatabase,
  orderId: string,
  outletId: string,
  actor: SessionUser,
  input: OrderCancel,
): Promise<OrderView> {
  const data = orderCancelSchema.parse(input);
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.outletId, outletId)))
    .limit(1);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
  }
  if (order.status === "paid" || order.status === "dibatalkan") {
    throw new HttpError(409, "INVALID_STATUS", "Transaksi tidak dapat dibatalkan");
  }

  await db
    .update(orders)
    .set({
      status: "dibatalkan",
      cancelledReason: data.reason,
      cancelledBy: actor.id,
    })
    .where(eq(orders.id, orderId));

  await db.insert(auditLogs).values({
    outletId,
    userId: actor.id,
    action: "order.cancel",
    entity: "order",
    entityId: orderId,
    before: { status: order.status },
    after: { status: "dibatalkan", reason: data.reason },
  });

  return getOrder(db, orderId, outletId);
}

export async function getReceipt(db: AppDatabase, token: string): Promise<ReceiptView> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, token))
    .limit(1);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Struk tidak ditemukan");
  }

  const [View] = await hydrateOrders(db, [order]);
  const [outlet] = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, order.outletId))
    .limit(1);

  if (!outlet) {
    throw new HttpError(404, "NOT_FOUND", "Outlet tidak ditemukan");
  }

  return {
    order: View,
    outlet: {
      id: outlet.id,
      name: outlet.name,
      address: outlet.address ?? "",
      phone: outlet.phone ?? "",
      receiptFooter: outlet.receiptFooter ?? "",
      taxPercent: Number(outlet.taxPercent),
    },
    cashierName: View.createdByName,
  };
}
