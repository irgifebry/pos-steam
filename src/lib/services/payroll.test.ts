import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import { outlets, user as userTable, attendance, payrollRuns, payrollItems } from "@/lib/db/schema";
import { getPayroll, savePayroll } from "./payroll";
import { eq } from "drizzle-orm";

const outletId = "outlet-payroll";
const userId = "user-payroll";
const period = "2026-10";

describe("payroll service", () => {
  let db: AppDatabase;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();

    await db.insert(outlets).values({ id: outletId, name: "Outlet Payroll" });
    await db.insert(userTable).values({
      id: userId,
      name: "Karyawan Uji",
      email: "karyawan-payroll@contoh.id",
      role: "operator",
      outletId,
      dailyRate: 100000,
      active: true,
    });

    // dua hari hadir dalam periode Oktober 2026
    await db.insert(attendance).values([
      {
        outletId,
        userId,
        date: "2026-10-02",
        status: "hadir",
        checkIn: new Date("2026-10-02T08:00:00+07:00"),
        checkOut: new Date("2026-10-02T17:00:00+07:00"),
        recordedBy: userId,
      },
      {
        outletId,
        userId,
        date: "2026-10-03",
        status: "hadir",
        checkIn: new Date("2026-10-03T08:00:00+07:00"),
        checkOut: new Date("2026-10-03T17:00:00+07:00"),
        recordedBy: userId,
      },
    ]);
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengambil draft payroll tanpa run, nilai dari rangkuman absensi", async () => {
    const payroll = await getPayroll(db, outletId, period);
    expect(payroll.id).toBeNull();
    expect(payroll.status).toBe("draft");
    expect(payroll.items).toHaveLength(1);
    expect(payroll.items[0].hadir).toBe(2);
    expect(payroll.items[0].dailyRate).toBe(100000);
    expect(payroll.totals.gross).toBe(200000);
  });

  it("menyimpan draft payroll dengan penyesuaian tunjangan/lembur/potongan", async () => {
    const payroll = await savePayroll(db, outletId, userId, {
      period,
      adjustments: {
        [userId]: { tunjangan: 20000, lembur: 15000, potongan: 10000 },
      },
      finalize: false,
    });

    expect(payroll.id).toBeTruthy();
    expect(payroll.status).toBe("draft");
    const item = payroll.items[0];
    expect(item.allowance).toBe(20000);
    expect(item.overtimePay).toBe(15000);
    expect(item.deductions).toBe(10000);
    expect(item.gross).toBe(2 * 100000 + 20000 + 15000);
    expect(item.net).toBe(item.gross - 10000);

    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.outletId, outletId));
    expect(run.status).toBe("draft");
    expect(run.finalizedAt).toBeNull();

    const savedItems = await db.select().from(payrollItems).where(eq(payrollItems.payrollRunId, run.id));
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].allowance).toBe(20000);
  });

  it("menggunakan nilai tersimpan saat diambil ulang", async () => {
    const payroll = await getPayroll(db, outletId, period);
    expect(payroll.status).toBe("draft");
    expect(payroll.items[0].allowance).toBe(20000);
    expect(payroll.items[0].net).toBe(225000);
  });

  it("finalisasi payroll mengunci dan mencatat waktu", async () => {
    const payroll = await savePayroll(db, outletId, userId, {
      period,
      adjustments: {},
      finalize: true,
    });

    expect(payroll.status).toBe("final");
    expect(payroll.finalizedAt).toBeInstanceOf(Date);

    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.outletId, outletId));
    expect(run.status).toBe("final");
    expect(run.finalizedAt).toBeInstanceOf(Date);
  });

  it("menolak penyimpanan setelah finalisasi", async () => {
    await expect(
      savePayroll(db, outletId, userId, {
        period,
        adjustments: { [userId]: { tunjangan: 999999, lembur: 0, potongan: 0 } },
        finalize: false,
      }),
    ).rejects.toMatchObject({ status: 409, code: "PAYROLL_FINAL" });
  });

  it("hanya mengambil transaksi dalam periode yang diminta", async () => {
    await db.insert(attendance).values({
      outletId,
      userId,
      date: "2026-11-01",
      status: "hadir",
      recordedBy: userId,
    });

    const november = await getPayroll(db, outletId, "2026-11");
    expect(november.items[0].hadir).toBe(1);

    const oktober = await getPayroll(db, outletId, "2026-10");
    expect(oktober.items[0].hadir).toBe(2);
  });
});
