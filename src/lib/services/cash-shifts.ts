import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { auditLogs, cashShifts, orders, payments, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { cashShiftCloseSchema, cashShiftOpenSchema } from "@/lib/schemas";
import type { CashShiftClose, CashShiftOpen } from "@/lib/types";
import { jakartaDate } from "./orders";

export type CashShiftView = {
  id: string;
  date: string;
  openedBy: string;
  openedByName: string;
  openingCash: number;
  closedBy: string | null;
  closedByName: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  note: string;
  openedAt: Date;
  closedAt: Date | null;
};

export type CashShiftState = {
  open: CashShiftView | null;
  history: CashShiftView[];
};

async function hydrate(
  db: AppDatabase,
  rows: (typeof cashShifts.$inferSelect)[],
): Promise<CashShiftView[]> {
  if (rows.length === 0) return [];

  const userIds = [
    ...new Set(
      rows.flatMap((row) => [row.openedBy, row.closedBy]).filter((id): id is string => Boolean(id)),
    ),
  ];
  const users =
    userIds.length === 0
      ? []
      : await db
          .select({ id: userTable.id, name: userTable.name })
          .from(userTable)
          .where(inArray(userTable.id, userIds));
  const names = new Map(users.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    openedBy: row.openedBy,
    openedByName: names.get(row.openedBy) ?? "Kasir",
    openingCash: row.openingCash,
    closedBy: row.closedBy,
    closedByName: row.closedBy ? (names.get(row.closedBy) ?? "Kasir") : null,
    closingCash: row.closingCash,
    expectedCash: row.expectedCash,
    difference: row.difference,
    note: row.note ?? "",
    openedAt: row.createdAt,
    closedAt: row.closedBy ? row.updatedAt : null,
  }));
}

export async function getCashShiftState(
  db: AppDatabase,
  outletId: string,
): Promise<CashShiftState> {
  const rows = await db
    .select()
    .from(cashShifts)
    .where(eq(cashShifts.outletId, outletId))
    .orderBy(desc(cashShifts.createdAt))
    .limit(30);

  const history = await hydrate(db, rows);
  return {
    open: history.find((shift) => shift.closedBy === null) ?? null,
    history,
  };
}

export async function openCashShift(
  db: AppDatabase,
  outletId: string,
  actorId: string,
  input: CashShiftOpen,
): Promise<CashShiftState> {
  const data = cashShiftOpenSchema.parse(input);
  const [existing] = await db
    .select({ id: cashShifts.id })
    .from(cashShifts)
    .where(and(eq(cashShifts.outletId, outletId), sql`${cashShifts.closedBy} is null`))
    .limit(1);

  if (existing) {
    throw new HttpError(409, "SHIFT_OPEN", "Masih ada shift kas yang terbuka");
  }

  await db.transaction(async (tx) => {
    const [shift] = await tx
      .insert(cashShifts)
      .values({
        outletId,
        date: jakartaDate(),
        openedBy: actorId,
        openingCash: data.openingCash,
        note: data.note,
      })
      .returning({ id: cashShifts.id });

    await tx.insert(auditLogs).values({
      outletId,
      userId: actorId,
      action: "cash_shift.open",
      entity: "cash_shift",
      entityId: shift.id,
      after: { openingCash: data.openingCash },
    });
  });

  return getCashShiftState(db, outletId);
}

export async function closeCashShift(
  db: AppDatabase,
  outletId: string,
  shiftId: string,
  actorId: string,
  input: CashShiftClose,
): Promise<CashShiftState> {
  const data = cashShiftCloseSchema.parse(input);
  const [shift] = await db
    .select()
    .from(cashShifts)
    .where(and(eq(cashShifts.id, shiftId), eq(cashShifts.outletId, outletId)))
    .limit(1);

  if (!shift) {
    throw new HttpError(404, "NOT_FOUND", "Shift kas tidak ditemukan");
  }
  if (shift.closedBy) {
    throw new HttpError(409, "SHIFT_CLOSED", "Shift kas sudah ditutup");
  }

  const [cashRow] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.outletId, outletId),
        eq(payments.method, "tunai"),
        gte(payments.createdAt, shift.createdAt),
      ),
    );

  const expectedCash = shift.openingCash + Number(cashRow?.total ?? 0);
  const difference = data.closingCash - expectedCash;

  await db.transaction(async (tx) => {
    await tx
      .update(cashShifts)
      .set({
        closedBy: actorId,
        closingCash: data.closingCash,
        expectedCash,
        difference,
        updatedAt: new Date(),
      })
      .where(eq(cashShifts.id, shift.id));

    await tx.insert(auditLogs).values({
      outletId,
      userId: actorId,
      action: "cash_shift.close",
      entity: "cash_shift",
      entityId: shift.id,
      before: { openingCash: shift.openingCash },
      after: { closingCash: data.closingCash, expectedCash, difference },
    });
  });

  return getCashShiftState(db, outletId);
}
