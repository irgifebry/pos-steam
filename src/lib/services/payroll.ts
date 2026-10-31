import { and, eq } from "drizzle-orm";
import { auditLogs, payrollItems, payrollRuns } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { payrollSaveSchema } from "@/lib/schemas";
import type { PayrollSave, Role } from "@/lib/types";
import { attendanceSummary } from "./attendance";

export type PayrollItemView = {
  userId: string;
  name: string;
  role: Role;
  dailyRate: number;
  daysPresent: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  cuti: number;
  totalHours: number;
  allowance: number;
  overtimePay: number;
  deductions: number;
  gross: number;
  net: number;
};

export type PayrollView = {
  id: string | null;
  period: string;
  status: "draft" | "final";
  finalizedAt: Date | null;
  items: PayrollItemView[];
  totals: { gross: number; net: number };
};

export async function getPayroll(
  db: AppDatabase,
  outletId: string,
  period: string,
): Promise<PayrollView> {
  const [run] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.outletId, outletId), eq(payrollRuns.period, period)))
    .limit(1);

  const summary = await attendanceSummary(db, outletId, period);
  const savedItems = run
    ? await db
        .select()
        .from(payrollItems)
        .where(eq(payrollItems.payrollRunId, run.id))
    : [];
  const savedByUser = new Map(savedItems.map((item) => [item.userId, item]));

  const isFinal = run?.status === "final";

  const items: PayrollItemView[] = summary.map((row) => {
    const saved = savedByUser.get(row.userId);
    const dailyRate = saved?.dailyRate ?? row.dailyRate;
    const daysPresent = isFinal ? (saved?.daysPresent ?? row.hadir) : row.hadir;
    const allowance = saved?.allowance ?? 0;
    const overtimePay = saved?.overtimePay ?? 0;
    const deductions = saved?.deductions ?? 0;
    const gross = isFinal && saved?.gross !== undefined
      ? saved.gross
      : daysPresent * dailyRate + allowance + overtimePay;
    const net = isFinal && saved?.net !== undefined
      ? saved.net
      : gross - deductions;

    return {
      userId: row.userId,
      name: row.name,
      role: row.role,
      dailyRate,
      daysPresent,
      hadir: row.hadir,
      izin: row.izin,
      sakit: row.sakit,
      alpha: row.alpha,
      cuti: row.cuti,
      totalHours: Math.round(row.totalHours * 100) / 100,
      allowance,
      overtimePay,
      deductions,
      gross,
      net,
    };
  });

  return {
    id: run?.id ?? null,
    period,
    status: run?.status === "final" ? "final" : "draft",
    finalizedAt: run?.finalizedAt ?? null,
    items,
    totals: {
      gross: items.reduce((sum, item) => sum + item.gross, 0),
      net: items.reduce((sum, item) => sum + item.net, 0),
    },
  };
}

export async function savePayroll(
  db: AppDatabase,
  outletId: string,
  actorId: string,
  input: PayrollSave,
): Promise<PayrollView> {
  const data = payrollSaveSchema.parse(input);

  const [existingRun] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.outletId, outletId), eq(payrollRuns.period, data.period)))
    .limit(1);

  if (existingRun?.status === "final") {
    throw new HttpError(409, "PAYROLL_FINAL", "Payroll periode ini sudah difinalisasi");
  }

  const summary = await attendanceSummary(db, outletId, data.period);
  const now = new Date();
  const status = data.finalize ? "final" : "draft";

  const calculated = summary.map((row) => {
    const adjustment = data.adjustments[row.userId] ?? {
      tunjangan: 0,
      lembur: 0,
      potongan: 0,
    };
    const daysPresent = row.hadir;
    const dailyRate = row.dailyRate;
    const allowance = adjustment.tunjangan;
    const overtimePay = adjustment.lembur;
    const deductions = adjustment.potongan;
    const gross = daysPresent * dailyRate + allowance + overtimePay;
    const net = gross - deductions;

    return {
      userId: row.userId,
      daysPresent,
      dailyRate,
      allowance,
      overtimePay,
      overtimeHours: "0",
      gross,
      deductions,
      net,
    };
  });

  const runId = await db.transaction(async (tx) => {
    let id = existingRun?.id;
    if (id) {
      await tx
        .update(payrollRuns)
        .set({
          status,
          generatedBy: actorId,
          finalizedAt: data.finalize ? now : null,
          updatedAt: now,
        })
        .where(eq(payrollRuns.id, id));
    } else {
      const [created] = await tx
        .insert(payrollRuns)
        .values({
          outletId,
          period: data.period,
          status,
          generatedBy: actorId,
          finalizedAt: data.finalize ? now : null,
        })
        .returning({ id: payrollRuns.id });
      id = created.id;
    }

    await tx.delete(payrollItems).where(eq(payrollItems.payrollRunId, id));
    if (calculated.length > 0) {
      await tx.insert(payrollItems).values(
        calculated.map((item) => ({
          payrollRunId: id!,
          ...item,
        })),
      );
    }

    await tx.insert(auditLogs).values({
      outletId,
      userId: actorId,
      action: data.finalize ? "payroll.finalize" : "payroll.save",
      entity: "payroll_run",
      entityId: id,
      after: {
        period: data.period,
        status,
        totalNet: calculated.reduce((sum, item) => sum + item.net, 0),
      },
    });

    return id;
  });

  void runId;
  return getPayroll(db, outletId, data.period);
}
