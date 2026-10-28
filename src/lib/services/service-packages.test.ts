import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { createTestDatabase } from "@/lib/db/test-db";
import { orderItems, orders, outlets, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import {
  createServicePackage,
  deactivateServicePackage,
  listServicePackages,
  updateServicePackage,
} from "./service-packages";

describe("service packages", () => {
  let db: AppDatabase;
  let outletId: string;
  let userId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Uji" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    const [admin] = await db
      .insert(userTable)
      .values({ name: "Admin Uji", email: "admin-uji@contoh.id", role: "admin" })
      .returning({ id: userTable.id });
    userId = admin.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("menyimpan paket motor dan mengembalikannya dengan field lengkap", async () => {
    const created = await createServicePackage(db, outletId, {
      name: "Komplit",
      vehicleType: "motor",
      price: 35000,
      durationMin: 30,
      description: "Cuci + wax",
      sortOrder: 1,
      active: true,
    });

    expect(created.name).toBe("Komplit");
    expect(created.vehicleType).toBe("motor");
    expect(created.price).toBe(35000);
    expect(created.durationMin).toBe(30);
    expect(created.active).toBe(true);
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it("menolak paket dengan nama yang sama pada tipe kendaraan yang sama", async () => {
    await expect(
      createServicePackage(db, outletId, {
        name: "Komplit",
        vehicleType: "motor",
        price: 40000,
        durationMin: 30,
        description: "",
        sortOrder: 0,
        active: true,
      }),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE" });
  });

  it("mengizinkan nama yang sama untuk tipe kendaraan berbeda", async () => {
    const created = await createServicePackage(db, outletId, {
      name: "Komplit",
      vehicleType: "mobil",
      price: 60000,
      durationMin: 45,
      description: "",
      sortOrder: 0,
      active: true,
    });
    expect(created.vehicleType).toBe("mobil");
  });

  it("menolak harga 0", async () => {
    await expect(
      createServicePackage(db, outletId, {
        name: "Gratis",
        vehicleType: "motor",
        price: 0,
        durationMin: 15,
        description: "",
        sortOrder: 0,
        active: true,
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("tidak mengubah harga snapshot pada order lama saat paket diedit", async () => {
    const paket = await createServicePackage(db, outletId, {
      name: "Snapshot",
      vehicleType: "motor",
      price: 25000,
      durationMin: 20,
      description: "",
      sortOrder: 0,
      active: true,
    });

    const [order] = await db
      .insert(orders)
      .values({
        outletId,
        invoiceNo: "S-20261028-001",
        vehicleType: "motor",
        queueSeq: 1,
        queuePrefix: "M",
        createdBy: userId,
      })
      .returning({ id: orders.id });

    const [item] = await db
      .insert(orderItems)
      .values({
        orderId: order.id,
        kind: "paket",
        refId: paket.id,
        nameSnapshot: paket.name,
        priceSnapshot: paket.price,
        qty: 1,
        subtotal: paket.price,
      })
      .returning({ id: orderItems.id });

    const updated = await updateServicePackage(db, paket.id, { price: 50000 });
    expect(updated.price).toBe(50000);

    const [snapshot] = await db
      .select({ priceSnapshot: orderItems.priceSnapshot })
      .from(orderItems)
      .where(eq(orderItems.id, item.id));
    expect(snapshot.priceSnapshot).toBe(25000);
  });

  it("menyembunyikan paket non-aktif secara default", async () => {
    const paket = await createServicePackage(db, outletId, {
      name: "Nonaktif",
      vehicleType: "mobil",
      price: 30000,
      durationMin: 25,
      description: "",
      sortOrder: 0,
      active: true,
    });

    await deactivateServicePackage(db, paket.id);

    const visible = await listServicePackages(db, { outletId });
    expect(visible.some((row) => row.id === paket.id)).toBe(false);

    const all = await listServicePackages(db, { outletId, includeInactive: true });
    expect(all.some((row) => row.id === paket.id)).toBe(true);
  });

  it("memfilter paket berdasarkan tipe kendaraan", async () => {
    const motorOnly = await listServicePackages(db, { outletId, vehicleType: "mobil" });
    expect(motorOnly.length).toBeGreaterThan(0);
    expect(motorOnly.every((row) => row.vehicleType === "mobil")).toBe(true);
  });

  it("mengurutkan berdasarkan sortOrder lalu nama", async () => {
    await createServicePackage(db, outletId, {
      name: "Urut B",
      vehicleType: "mobil",
      price: 10000,
      durationMin: 10,
      description: "",
      sortOrder: 2,
      active: true,
    });
    await createServicePackage(db, outletId, {
      name: "Urut A",
      vehicleType: "mobil",
      price: 10000,
      durationMin: 10,
      description: "",
      sortOrder: 1,
      active: true,
    });

    const rows = await listServicePackages(db, { outletId, vehicleType: "mobil" });
    const names = rows
      .filter((row) => row.name === "Urut A" || row.name === "Urut B")
      .map((row) => row.name);
    expect(names).toEqual(["Urut A", "Urut B"]);
  });
});
