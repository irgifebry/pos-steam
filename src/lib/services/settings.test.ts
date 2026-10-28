import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import { outlets, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createBank } from "./banks";
import { getSettings } from "./settings";

describe("settings", () => {
  let db: AppDatabase;
  let outletId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Uji", receiptFooter: "Terima kasih" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    await createBank(db, outletId, {
      name: "BCA",
      accountNumber: "123",
      accountName: "Outlet",
      active: true,
    });

    await db.insert(userTable).values([
      { name: "Karyawan A", email: "a@contoh.id", dailyRate: 50000, outletId },
      { name: "Karyawan B", email: "b@contoh.id", dailyRate: 50000, outletId },
      { name: "Karyawan C", email: "c@contoh.id", dailyRate: 60000, outletId },
    ]);
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengembalikan gabungan outlet, bank, dan tarif gaji default", async () => {
    const settings = await getSettings(db, outletId);
    expect(settings.outlet.name).toBe("Outlet Uji");
    expect(settings.outlet.receiptFooter).toBe("Terima kasih");
    expect(settings.banks).toHaveLength(1);
    expect(settings.banks[0].name).toBe("BCA");
    expect(settings.defaultDailyRate).toBe(50000);
  });
});
