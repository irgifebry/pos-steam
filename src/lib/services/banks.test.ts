import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import { outlets } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createBank, listBanks, updateBank } from "./banks";

describe("banks", () => {
  let db: AppDatabase;
  let outletId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Uji" })
      .returning({ id: outlets.id });
    outletId = outlet.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("menyimpan bank beserta nomor rekening", async () => {
    const bank = await createBank(db, outletId, {
      name: "BCA",
      accountNumber: "1234567890",
      accountName: "Cuci Steam Bersama",
      active: true,
    });

    expect(bank.name).toBe("BCA");
    expect(bank.accountNumber).toBe("1234567890");
    expect(bank.accountName).toBe("Cuci Steam Bersama");
    expect(bank.active).toBe(true);
  });

  it("memperbarui sebagian data bank", async () => {
    const bank = await createBank(db, outletId, {
      name: "BRI",
      accountNumber: "111",
      accountName: "Outlet",
      active: true,
    });

    const updated = await updateBank(db, bank.id, { accountNumber: "222" });
    expect(updated.accountNumber).toBe("222");
    expect(updated.name).toBe("BRI");
  });

  it("hanya menampilkan bank aktif", async () => {
    const bank = await createBank(db, outletId, {
      name: "Mandiri",
      accountNumber: "333",
      accountName: "Outlet",
      active: true,
    });
    await updateBank(db, bank.id, { active: false });

    const rows = await listBanks(db, outletId);
    expect(rows.some((row) => row.id === bank.id)).toBe(false);
    expect(rows.length).toBe(2);
  });
});
