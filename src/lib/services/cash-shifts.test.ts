import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import {
  outlets,
  servicePackages,
  addons,
  user as userTable,
  banks,
  cashShifts,
  payments,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getCashShiftState,
  openCashShift,
  closeCashShift,
} from "./cash-shifts";
import { createOrder } from "./orders";
import type { SessionUser } from "@/lib/auth/session";

const actorId = "actor-kasir";
const outletId = "outlet-kas";
const actor: SessionUser = {
  id: actorId,
  name: "Kasir Uji",
  email: "kasir-kas@contoh.id",
  role: "kasir",
  outletId,
  phone: "",
  dailyRate: 0,
  active: true,
};

let pkgId: string;
let addonId: string;
let bankId: string;

function cashInput(overrides: { openingCash: number; note?: string }) {
  return { openingCash: overrides.openingCash, note: overrides.note ?? "" };
}

describe("cash shift service", () => {
  let db: AppDatabase;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();

    await db.insert(outlets).values({ id: outletId, name: "Outlet Kas" });
    await db.insert(userTable).values({
      id: actorId,
      name: "Kasir Uji",
      email: "kasir-kas@contoh.id",
      role: "kasir",
      outletId,
      active: true,
    });

    const [pkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Paket Uji",
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
        name: "Addon Uji",
        price: 5000,
        unitLabel: "pcs",
        vehicleTypes: ["motor", "mobil"],
        active: true,
      })
      .returning({ id: addons.id });
    addonId = addon.id;

    const [bank] = await db
      .insert(banks)
      .values({
        outletId,
        name: "Bank Uji",
        accountNumber: "123",
        accountName: "Toko",
        active: true,
      })
      .returning({ id: banks.id });
    bankId = bank.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("membuka shift kas dan menolak pembukaan ganda", async () => {
    const state = await openCashShift(db, outletId, actorId, cashInput({ openingCash: 100000, note: "Awal hari" }));
    expect(state.open).not.toBeNull();
    expect(state.open!.openingCash).toBe(100000);
    expect(state.open!.closedBy).toBeNull();

    await expect(
      openCashShift(db, outletId, actorId, cashInput({ openingCash: 50000 })),
    ).rejects.toMatchObject({ status: 409, code: "SHIFT_OPEN" });
  });

  it("menghitung kas seharusnya saat ditutup dari pembayaran tunai sejak shift dibuka", async () => {
    const order1 = await createOrder(db, outletId, actor, {
      addons: [{ addonId, qty: 1 }],
      customerName: "Tunai 1",
      customerPhone: "",
      plate: "",
      vehicleType: "motor",
      packageId: pkgId,
      payment: { method: "tunai", cashReceived: 30000 },
    });
    const order2 = await createOrder(db, outletId, actor, {
      addons: [],
      customerName: "Tunai 2",
      customerPhone: "",
      plate: "",
      vehicleType: "motor",
      packageId: pkgId,
      payment: { method: "tunai", cashReceived: 25000 },
    });

    const stateBefore = await getCashShiftState(db, outletId);
    const shift = stateBefore.open;
    expect(shift).not.toBeNull();

    const closed = await closeCashShift(db, outletId, shift!.id, actorId, { closingCash: 200000 });

    const expected = 100000 + order1.grandTotal + order2.grandTotal;
    expect(closed.open).toBeNull();
    const history = closed.history[0];
    expect(history.closingCash).toBe(200000);
    expect(history.expectedCash).toBe(expected);
    expect(history.difference).toBe(200000 - expected);

    const row = await db
      .select()
      .from(cashShifts)
      .where(eq(cashShifts.id, shift!.id))
      .limit(1);
    expect(row[0].closedBy).toBe(actorId);
    expect(row[0].difference).toBe(200000 - expected);
  });

  it("menolak penutupan shift yang sudah ditutup", async () => {
    const state = await getCashShiftState(db, outletId);
    const closed = state.history.find((item) => item.closedBy);
    expect(closed).toBeDefined();

    await expect(
      closeCashShift(db, outletId, closed!.id, actorId, { closingCash: 1000 }),
    ).rejects.toMatchObject({ status: 409, code: "SHIFT_CLOSED" });
  });

  it("tidak menghitung pembayaran transfer dalam kas seharusnya", async () => {
    await openCashShift(db, outletId, actorId, cashInput({ openingCash: 50000 }));
    const state = await getCashShiftState(db, outletId);
    const shift = state.open!;

    await createOrder(db, outletId, actor, {
      addons: [],
      customerName: "Transfer",
      customerPhone: "",
      plate: "",
      vehicleType: "motor",
      packageId: pkgId,
      payment: { method: "transfer", bankId, referenceNo: "REF-001" },
    });

    const closed = await closeCashShift(db, outletId, shift.id, actorId, { closingCash: 50000 });
    expect(closed.history[0].expectedCash).toBe(50000);
    expect(closed.history[0].difference).toBe(0);
  });

  // keep value imports referenced
  it("referensi tabel tersedia", () => {
    expect(typeof cashShifts).toBe("object");
    expect(typeof payments).toBe("object");
  });
});
