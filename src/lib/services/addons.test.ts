import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import { outlets } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import {
  createAddon,
  deactivateAddon,
  listAddons,
  updateAddon,
} from "./addons";

describe("addons", () => {
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

  it("menolak nama add-on duplikat di outlet yang sama", async () => {
    await createAddon(db, outletId, {
      name: "Semprot Wax",
      price: 10000,
      unitLabel: "pcs",
      vehicleTypes: ["mobil"],
      active: true,
    });

    await expect(
      createAddon(db, outletId, {
        name: "Semprot Wax",
        price: 12000,
        unitLabel: "pcs",
        vehicleTypes: ["motor"],
        active: true,
      }),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE" });
  });

  it("menyaring add-on berdasarkan tipe kendaraan", async () => {
    await createAddon(db, outletId, {
      name: "Ojek Ban",
      price: 20000,
      unitLabel: "ban",
      vehicleTypes: ["motor"],
      active: true,
    });

    const motor = await listAddons(db, { outletId, vehicleType: "motor" });
    expect(motor.some((row) => row.name === "Ojek Ban")).toBe(true);
    expect(motor.some((row) => row.name === "Semprot Wax")).toBe(false);

    const mobil = await listAddons(db, { outletId, vehicleType: "mobil" });
    expect(mobil.some((row) => row.name === "Semprot Wax")).toBe(true);
    expect(mobil.some((row) => row.name === "Ojek Ban")).toBe(false);
  });

  it("menyimpan beberapa tipe kendaraan sebagai array", async () => {
    const addon = await createAddon(db, outletId, {
      name: "Poles Kaca",
      price: 15000,
      unitLabel: "pcs",
      vehicleTypes: ["motor", "mobil"],
      active: true,
    });

    expect(addon.vehicleTypes).toEqual(["motor", "mobil"]);
  });

  it("memperbarui sebagian field tanpa mereset field lain", async () => {
    const addon = await createAddon(db, outletId, {
      name: "Update Sebagian",
      price: 5000,
      unitLabel: "pcs",
      vehicleTypes: ["motor"],
      active: true,
    });

    const updated = await updateAddon(db, addon.id, { price: 7500 });
    expect(updated.price).toBe(7500);
    expect(updated.name).toBe("Update Sebagian");
    expect(updated.vehicleTypes).toEqual(["motor"]);
    expect(updated.unitLabel).toBe("pcs");
  });

  it("menyembunyikan add-on non-aktif secara default", async () => {
    const addon = await createAddon(db, outletId, {
      name: "Addon Nonaktif",
      price: 8000,
      unitLabel: "pcs",
      vehicleTypes: ["mobil"],
      active: true,
    });

    await deactivateAddon(db, addon.id);

    const visible = await listAddons(db, { outletId });
    expect(visible.some((row) => row.id === addon.id)).toBe(false);

    const all = await listAddons(db, { outletId, includeInactive: true });
    expect(all.some((row) => row.id === addon.id)).toBe(true);
  });
});
