import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import {
  outlets,
  servicePackages,
  addons,
  user as userTable,
  banks,
  orderItems,
  payments,
} from "@/lib/db/schema";
import { createOrder, updateOrderStatus, addOrderPayment, cancelOrder, getReceipt, listOrders } from "./orders";
import { jakartaDate } from "./orders";
import type { SessionUser } from "@/lib/auth/session";
import type { OrderCreate } from "@/lib/types";
import { eq } from "drizzle-orm";

const actorId = "actor-kasir";
const outletId = "outlet-uji";
const actor: SessionUser = {
  id: actorId,
  name: "Kasir Uji",
  email: "kasir-uji@contoh.id",
  role: "kasir",
  outletId,
  phone: "",
  dailyRate: 0,
  active: true,
};

let pkgMotorId: string;
let addonId: string;

function orderInput(overrides: Partial<OrderCreate>): OrderCreate {
  return {
    vehicleType: "motor",
    packageId: pkgMotorId!,
    addons: [],
    customerName: "Pelanggan Uji",
    customerPhone: "",
    plate: "",
    ...overrides,
  };
}

describe("order service", () => {
  let db: AppDatabase;

  async function seedOutlet() {
    const [outlet] = await db
      .insert(outlets)
      .values({ id: outletId, name: "Outlet Uji", taxPercent: "10" })
      .returning({ id: outlets.id });
    return outlet.id;
  }

  async function seedCatalog(outletId: string) {
    const [pkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Cuci Reguler Motor",
        vehicleType: "motor",
        price: 25000,
        durationMin: 20,
        active: true,
      })
      .returning({ id: servicePackages.id });
    pkgMotorId = pkg.id;

    const [addon] = await db
      .insert(addons)
      .values({
        outletId,
        name: "Semprot Wax",
        price: 5000,
        unitLabel: "pcs",
        vehicleTypes: ["motor", "mobil"],
        active: true,
      })
      .returning({ id: addons.id });
    addonId = addon.id;

    await db.insert(banks).values({
      outletId,
      name: "Bank Contoh",
      accountNumber: "123456",
      accountName: "Toko Cuci",
      active: true,
    });

    await db.insert(userTable).values({
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: "kasir",
      outletId,
      active: true,
    });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();
    const id = await seedOutlet();
    await seedCatalog(id);
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("membuat order tunai dengan paket dan add-on, tetap status menunggu tapi sudah dibayar", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({
      addons: [{ addonId, qty: 1 }],
      customerName: "Budi",
      plate: "B 1234 ABC",
      payment: { method: "tunai", cashReceived: 33000 },
    }));

    expect(order.status).toBe("menunggu");
    expect(order.paid).toBe(true);
    expect(order.grandTotal).toBe(25000 + 5000 + Math.round((30000 * 10) / 100));
    expect(order.packageName).toBe("Cuci Reguler Motor");
    expect(order.addons).toHaveLength(1);
    expect(order.queueNo).toMatch(/^M-\d{3}$/);
    expect(order.invoiceNo).toMatch(/^S-\d{8}-\d{3}$/);
    expect(order.businessDate).toBe(jakartaDate());

    const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id));
    expect(payment.method).toBe("tunai");
    expect(payment.changeAmount).toBe(33000 - order.grandTotal);
  });

  it("membuat order tanpa pembayaran, belum lunas", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({ customerName: "Sari" }));

    expect(order.paid).toBe(false);
    expect(order.payment).toBeNull();
    expect(order.status).toBe("menunggu");
  });

  it("terima paket mobil, tolak add-on yang tidak cocok jenis kendaraan", async () => {
    const [mobilPkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Cuci Reguler Mobil",
        vehicleType: "mobil",
        price: 50000,
        durationMin: 30,
        active: true,
      })
      .returning({ id: servicePackages.id });

    await expect(
      createOrder(db, outletId, actor, orderInput({ vehicleType: "mobil", packageId: mobilPkg.id })),
    ).resolves.toBeDefined();

    const [mobilAddon] = await db
      .insert(addons)
      .values({
        outletId,
        name: "Pembersih Interior Mobil",
        price: 50000,
        unitLabel: "pcs",
        vehicleTypes: ["mobil"],
        active: true,
      })
      .returning({ id: addons.id });

    await expect(
      createOrder(db, outletId, actor, orderInput({ vehicleType: "motor", addons: [{ addonId: mobilAddon.id, qty: 1 }] })),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("idempotent dengan clientId yang sama", async () => {
    const clientId = "11111111-1111-4111-8111-111111111111";
    const first = await createOrder(db, outletId, actor, orderInput({ clientId, customerName: "Idempotensi" }));
    const second = await createOrder(db, outletId, actor, orderInput({ clientId, customerName: "Diabaikan" }));
    expect(second.id).toBe(first.id);
  });

  it("mengubah status menunggu → proses → selesai, otomatis paid jika sudah bayar", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({
      customerName: "Alur Status",
      payment: { method: "tunai", cashReceived: 27500 },
    }));

    const proses = await updateOrderStatus(db, order.id, outletId, actor, { status: "proses" });
    expect(proses.status).toBe("proses");

    const selesai = await updateOrderStatus(db, order.id, outletId, actor, { status: "selesai" });
    expect(selesai.status).toBe("paid");
  });

  it("menambah pembayaran pada order selesai tanpa pembayaran, menjadi paid", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({ customerName: "Bayar Nanti" }));
    await updateOrderStatus(db, order.id, outletId, actor, { status: "proses" });
    const selesai = await updateOrderStatus(db, order.id, outletId, actor, { status: "selesai" });
    expect(selesai.status).toBe("selesai");
    expect(selesai.paid).toBe(false);

    const dibayar = await addOrderPayment(db, order.id, outletId, actor, {
      method: "tunai",
      cashReceived: selesai.grandTotal,
    });
    expect(dibayar.status).toBe("paid");
    expect(dibayar.paid).toBe(true);
  });

  it("menolak pembayaran pada order yang belum selesai", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({ customerName: "Belum Selesai" }));
    await expect(
      addOrderPayment(db, order.id, outletId, actor, { method: "tunai", cashReceived: 100000 }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("membatalkan order menunggu", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({ customerName: "Dibatalkan" }));
    const canceled = await cancelOrder(db, order.id, outletId, actor, { reason: "Pelanggan tidak datang" });
    expect(canceled.status).toBe("dibatalkan");
  });

  it("membatalkan order sudah dibayar ditolak", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({
      customerName: "Lunas",
      payment: { method: "tunai", cashReceived: 30000 },
    }));
    await updateOrderStatus(db, order.id, outletId, actor, { status: "proses" });
    await updateOrderStatus(db, order.id, outletId, actor, { status: "selesai" });
    await expect(
      cancelOrder(db, order.id, outletId, actor, { reason: "coba" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("mengambil struk publik berdasarkan UUID order (token)", async () => {
    const order = await createOrder(db, outletId, actor, orderInput({ customerName: "Struk" }));
    const receipt = await getReceipt(db, order.id);
    expect(receipt.order.id).toBe(order.id);
    expect(receipt.order.invoiceNo).toBe(order.invoiceNo);
    expect(receipt.outlet.name).toBe("Outlet Uji");
    expect(receipt.cashierName).toBe("Kasir Uji");
  });

  it("menolak struk dengan token yang tidak dikenal", async () => {
    await expect(getReceipt(db, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("mengambil daftar order outlet hari ini", async () => {
    const today = jakartaDate();
    const list = await listOrders(db, {
      outletId,
      from: today,
      to: today,
      includePaid: true,
      limit: 50,
    });
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((o) => o.paid)).toBe(true);
  });

  // type references keep imports used
  it("referensi skema tersedia", () => {
    expect(typeof orderItems).toBe("object");
    expect(typeof payments).toBe("object");
  });
});
