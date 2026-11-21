import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import { outlets } from "@/lib/db/schema";
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
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengembalikan gabungan outlet dan bank", async () => {
    const settings = await getSettings(db, outletId);
    expect(settings.outlet.name).toBe("Outlet Uji");
    expect(settings.outlet.receiptFooter).toBe("Terima kasih");
    expect(settings.banks).toHaveLength(1);
    expect(settings.banks[0].name).toBe("BCA");
  });
});
