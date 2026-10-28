import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import { outlets } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { getOutlet, listOutlets, updateOutlet } from "./outlets";

describe("outlets", () => {
  let db: AppDatabase;
  let outletId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Awal", address: "Jl. Awal", taxPercent: "0" })
      .returning({ id: outlets.id });
    outletId = outlet.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("memperbarui nama dan pajak outlet", async () => {
    const updated = await updateOutlet(db, outletId, {
      name: "Outlet Baru",
      taxPercent: 11,
    });

    expect(updated.name).toBe("Outlet Baru");
    expect(updated.taxPercent).toBe(11);
    expect(updated.address).toBe("Jl. Awal");
  });

  it("mengembalikan outlet berdasarkan id", async () => {
    const outlet = await getOutlet(db, outletId);
    expect(outlet?.id).toBe(outletId);
    expect(outlet?.taxPercent).toBe(11);
  });

  it("mengembalikan null untuk outlet yang tidak ada", async () => {
    expect(await getOutlet(db, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("menolak update outlet yang tidak ada", async () => {
    await expect(
      updateOutlet(db, "00000000-0000-0000-0000-000000000000", { name: "X" }),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("mendaftar seluruh outlet", async () => {
    const rows = await listOutlets(db);
    expect(rows).toHaveLength(1);
  });
});
