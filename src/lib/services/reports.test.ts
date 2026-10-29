import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import {
  outlets,
  servicePackages,
  addons,
  user as userTable,
  orders,
  payments,
} from "@/lib/db/schema";
import { listReportTransactions } from "./reports";
import { createOrder, updateOrderStatus, addOrderPayment } from "./orders";
import type { SessionUser } from "@/lib/auth/session";

const actorId = "actor-laporan";
const outletId = "outlet-laporan";
const actor: SessionUser = {
  id: actorId,
  name: "Kasir Laporan",
  email: "kasir-laporan@contoh.id",
  role: "kasir",
  outletId,
  phone: "",
  dailyRate: 0,
  active: true,
};

let pkgId: string;
let addonId: string;
const today = new Date().toISOString().slice(0, 10);

describe("reports service", () => {
  let db: AppDatabase;

  async function selesakan(orderId: string) {
    await updateOrderStatus(db, orderId, outletId, actor, { status: "proses" });
    await updateOrderStatus(db, orderId, outletId, actor, { status: "selesai" });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();

    await db.insert(outlets).values({ id: outletId, name: "Outlet Laporan" });
    await db.insert(userTable).values({
      id: actorId,
      name: "Kasir Laporan",
      email: "kasir-laporan@contoh.id",
      role: "kasir",
      outletId,
      active: true,
    });

    const [pkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Paket Laporan",
        vehicleType: "motor",
        price: 20000,
        durationMin: 20,
        active: true,
      })
      .returning({ id: servicePackages.id });
    pkgId = pkg.id;

    const [addon] = await db
      .insert(addons)
      .values({
        outletId,
        name: "Addon Laporan",
        price: 5000,
        unitLabel: "pcs",
        vehicleTypes: ["motor", "mobil"],
        active: true,
      })
      .returning({ id: addons.id });
    addonId = addon.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("hanya mengambil transaksi yang sudah dibayar dengan detail add-on", async () => {
    const paid = await createOrder(db, outletId, actor, {
      vehicleType: "motor",
      packageId: pkgId,
      addons: [{ addonId, qty: 2 }],
      customerName: "Lunas",
      customerPhone: "",
      plate: "B 1111 AAA",
      payment: { method: "tunai", cashReceived: 60000 },
    });
    await selesakan(paid.id);

    const belumBayar = await createOrder(db, outletId, actor, {
      vehicleType: "motor",
      packageId: pkgId,
      addons: [],
      customerName: "Belum Bayar",
      customerPhone: "",
      plate: "B 2222 BBB",
    });
    await selesakan(belumBayar.id);

    const dibayarNanti = await createOrder(db, outletId, actor, {
      vehicleType: "motor",
      packageId: pkgId,
      addons: [],
      customerName: "Bayar Nanti",
      customerPhone: "",
      plate: "B 3333 CCC",
    });
    await selesakan(dibayarNanti.id);
    await addOrderPayment(db, dibayarNanti.id, outletId, actor, {
      method: "tunai",
      cashReceived: 20000,
    });

    const rows = await listReportTransactions(db, outletId, today, today);

    const ids = rows.map((row) => row.id);
    expect(ids).toContain(paid.id);
    expect(ids).toContain(dibayarNanti.id);
    expect(ids).not.toContain(belumBayar.id);

    const paidRow = rows.find((row) => row.id === paid.id)!;
    expect(paidRow.paymentMethod).toBe("Tunai");
    expect(paidRow.packageName).toBe("Paket Laporan");
    expect(paidRow.addons).toHaveLength(1);
    expect(paidRow.addons[0].name).toBe("Addon Laporan");
    expect(paidRow.addons[0].qty).toBe(2);
    expect(paidRow.addons[0].subtotal).toBe(10000);
    expect(paidRow.total).toBe(paid.grandTotal);
    expect(paidRow.employee).toBe("Kasir Laporan");
    expect(paidRow.plate).toBe("B 1111 AAA");
  });

  it("filter rentang tanggal", async () => {
    const rows = await listReportTransactions(db, outletId, today, today);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const kosong = await listReportTransactions(db, outletId, "2020-01-01", "2020-01-31");
    expect(kosong).toHaveLength(0);
  });

  it("referensi skema tersedia", () => {
    expect(typeof orders).toBe("object");
    expect(typeof payments).toBe("object");
  });
});
