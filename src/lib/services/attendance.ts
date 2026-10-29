import { and, asc, eq, gte, lte } from "drizzle-orm";
import { attendance, auditLogs, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { attendanceSaveSchema } from "@/lib/schemas";
import type { AttendanceSave, AttendanceStatus, Role } from "@/lib/types";

export type AttendanceView = {
  userId: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  note: string;
};

export type AttendanceSummaryRow = {
  userId: string;
  name: string;
  role: Role;
  dailyRate: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  cuti: number;
  totalHours: number;
};

function clock(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function timeToDate(date: string, time?: string): Date | null {
  if (!time) return null;
  return new Date(`${date}T${time}:00+07:00`);
}

function hoursBetween(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diff = (checkOut.getTime() - checkIn.getTime()) / 3_600_000;
  return diff > 0 ? diff : 0;
}

export async function listAttendance(
  db: AppDatabase,
  outletId: string,
  date: string,
): Promise<AttendanceView[]> {
  const rows = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.outletId, outletId), eq(attendance.date, date)))
    .orderBy(asc(attendance.createdAt));

  return rows.map((row) => ({
    userId: row.userId,
    status: row.status as AttendanceStatus,
    checkIn: clock(row.checkIn),
    checkOut: clock(row.checkOut),
    note: row.note ?? "",
  }));
}

export async function saveAttendance(
  db: AppDatabase,
  outletId: string,
  actorId: string,
  input: AttendanceSave,
): Promise<AttendanceView[]> {
  const data = attendanceSaveSchema.parse(input);

  const userIds = Object.keys(data.records);
  const employees =
    userIds.length === 0
      ? []
      : await db
          .select({ id: userTable.id })
          .from(userTable)
          .where(and(eq(userTable.outletId, outletId), eq(userTable.active, true)));

  const allowed = new Set(employees.map((row) => row.id));
  for (const userId of userIds) {
    if (!allowed.has(userId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Karyawan tidak ditemukan di outlet ini");
    }
  }

  await db.transaction(async (tx) => {
    for (const [userId, record] of Object.entries(data.records)) {
      const checkIn = timeToDate(data.date, record.checkIn);
      const checkOut = timeToDate(data.date, record.checkOut);
      if (checkIn && checkOut && checkOut.getTime() <= checkIn.getTime()) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Jam keluar harus lebih besar dari jam masuk",
        );
      }

      await tx
        .insert(attendance)
        .values({
          outletId,
          userId,
          date: data.date,
          status: record.status,
          checkIn,
          checkOut,
          note: record.note ?? "",
          recordedBy: actorId,
        })
        .onConflictDoUpdate({
          target: [attendance.outletId, attendance.userId, attendance.date],
          set: {
            status: record.status,
            checkIn,
            checkOut,
            note: record.note ?? "",
            recordedBy: actorId,
            updatedAt: new Date(),
          },
        });
    }

    await tx.insert(auditLogs).values({
      outletId,
      userId: actorId,
      action: "attendance.save",
      entity: "attendance",
      entityId: data.date,
      after: { date: data.date, count: userIds.length },
    });
  });

  return listAttendance(db, outletId, data.date);
}

function periodRange(period: string): { start: string; end: string } {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${period}-01`,
    end: `${period}-${String(lastDay).padStart(2, "0")}`,
  };
}

export async function attendanceSummary(
  db: AppDatabase,
  outletId: string,
  period: string,
): Promise<AttendanceSummaryRow[]> {
  const { start, end } = periodRange(period);

  const [employees, rows] = await Promise.all([
    db
      .select({
        id: userTable.id,
        name: userTable.name,
        role: userTable.role,
        dailyRate: userTable.dailyRate,
      })
      .from(userTable)
      .where(and(eq(userTable.outletId, outletId), eq(userTable.active, true)))
      .orderBy(asc(userTable.name)),
    db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.outletId, outletId),
          gte(attendance.date, start),
          lte(attendance.date, end),
        ),
      ),
  ]);

  const byUser = new Map<string, AttendanceSummaryRow>();
  for (const employee of employees) {
    byUser.set(employee.id, {
      userId: employee.id,
      name: employee.name,
      role: employee.role as Role,
      dailyRate: employee.dailyRate,
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
      cuti: 0,
      totalHours: 0,
    });
  }

  for (const row of rows) {
    const target = byUser.get(row.userId);
    if (!target) continue;
    switch (row.status) {
      case "hadir":
        target.hadir += 1;
        break;
      case "izin":
        target.izin += 1;
        break;
      case "sakit":
        target.sakit += 1;
        break;
      case "alpha":
        target.alpha += 1;
        break;
      case "cuti":
        target.cuti += 1;
        break;
    }
    target.totalHours += hoursBetween(row.checkIn, row.checkOut);
  }

  return Array.from(byUser.values());
}
