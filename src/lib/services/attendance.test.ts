import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import { outlets, user as userTable } from "@/lib/db/schema";
import { listAttendance, saveAttendance, attendanceSummary } from "./attendance";
import { jakartaDate } from "./orders";

const actorId = "actor-admin";

describe("attendance service", () => {
  let db: AppDatabase;
  let outletId: string;
  let userId: string;
  const today = jakartaDate();

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();

    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Uji" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    const [user] = await db
      .insert(userTable)
      .values({
        id: actorId,
        name: "Admin Uji",
        email: "admin-uji@contoh.id",
        role: "admin",
        outletId,
        dailyRate: 75000,
        active: true,
      })
      .returning({ id: userTable.id });
    userId = user.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("simpan absensi baru dan upsert pada tanggal yang sama", async () => {
    const first = await saveAttendance(db, outletId, actorId, {
      date: today,
      records: {
        [userId]: { status: "hadir", checkIn: "08:00", checkOut: "17:00" },
      },
    });

    expect(first).toHaveLength(1);
    expect(first[0].status).toBe("hadir");
    expect(first[0].checkIn).toBe("08:00");
    expect(first[0].checkOut).toBe("17:00");

    const second = await saveAttendance(db, outletId, actorId, {
      date: today,
      records: {
        [userId]: { status: "izin", checkIn: undefined, checkOut: undefined },
      },
    });

    expect(second).toHaveLength(1);
    expect(second[0].status).toBe("izin");
    expect(second[0].checkIn).toBeNull();
    expect(second[0].checkOut).toBeNull();

    // daftar absensi mencerminkan upsert
    const listed = await listAttendance(db, outletId, today);
    expect(listed).toHaveLength(1);
    expect(listed[0].status).toBe("izin");
  });

  it("menolak karyawan yang tidak terdaftar di outlet", async () => {
    await expect(
      saveAttendance(db, outletId, actorId, {
        date: today,
        records: {
          "user-tidak-terdaftar": { status: "hadir", checkIn: "08:00" },
        },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("ringkasan bulanan menghitung hadir dan jam", async () => {
    const summary = await attendanceSummary(db, outletId, today.slice(0, 7));
    const row = summary.find((item) => item.userId === userId);
    expect(row).toBeDefined();
    expect(row!.hadir).toBe(0); // bulan ini baru ada satu catatan izin pada hari ini, bukan hadir
    expect(row!.izin).toBe(1);
  });
});
