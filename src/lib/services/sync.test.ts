import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import { outlets, servicePackages, user as userTable } from "@/lib/db/schema";
import { getSyncBootstrap, processSyncBatch } from "./sync";
import type { SessionUser } from "@/lib/auth/session";

describe("sync service", () => {
  let db: AppDatabase;
  const outletId = "outlet-sync-test";
  let packageId: string;
  const actor: SessionUser = {
    id: "user-sync-test",
    name: "Kasir Sync",
    email: "sync@pos.test",
    role: "admin",
    outletId,
    phone: "",
    dailyRate: 0,
    active: true,
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();

    await db.insert(outlets).values({
      id: outletId,
      name: "Outlet Sync Uji",
      taxPercent: "0",
    });

    await db.insert(userTable).values({
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: "admin",
      outletId,
    });

    const [pkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Paket Motor Sync",
        vehicleType: "motor",
        price: 15000,
        durationMin: 15,
        active: true,
      })
      .returning();
    packageId = pkg.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("getSyncBootstrap mengembalikan master data dan counter awal", async () => {
    const data = await getSyncBootstrap(db, outletId);
    expect(data.outlet?.id).toBe(outletId);
    expect(data.packages.length).toBeGreaterThan(0);
    expect(data.todayCounters).toBeDefined();
    expect(typeof data.todayCounters.lastInvoiceSeq).toBe("number");
  });

  it("processSyncBatch memproses order.create secara idempotent dengan clientId", async () => {
    const clientId = randomUUID();

    const batch = {
      items: [
        {
          type: "order.create" as const,
          clientId,
          payload: {
            clientId,
            vehicleType: "motor" as const,
            packageId,
            addons: [],
            customerName: "Pelanggan Offline",
            customerPhone: "",
            plate: "B 9999 SYNC",
          },
        },
      ],
    };

    const result1 = await processSyncBatch(db, outletId, actor, batch);
    expect(result1.processed).toBe(1);
    expect(result1.results[0].success).toBe(true);
    const orderId1 = (result1.results[0].data as { id: string }).id;

    // Kirim ulang batch yang sama -> harus idempotent (sukses dan id order sama)
    const result2 = await processSyncBatch(db, outletId, actor, batch);
    expect(result2.processed).toBe(1);
    expect(result2.results[0].success).toBe(true);
    const orderId2 = (result2.results[0].data as { id: string }).id;
    expect(orderId2).toBe(orderId1);
  });
});
