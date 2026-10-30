import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { reportRangeSchema } from "@/lib/schemas";
import { listReportTransactions } from "@/lib/services/reports";
import { initializeServer } from "@/lib/server-init";

type EmployeeRow = { employee: string; count: number; total: number };

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const url = new URL(request.url);
    const range = reportRangeSchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    if (range.from > range.to) {
      throw new HttpError(400, "VALIDATION_ERROR", "Tanggal awal harus sebelum tanggal akhir");
    }

    const transactions = await listReportTransactions(
      getDatabase(),
      user.outletId,
      range.from,
      range.to,
    );

    const byEmployee = new Map<string, EmployeeRow>();
    for (const t of transactions) {
      const row = byEmployee.get(t.employee) ?? { employee: t.employee, count: 0, total: 0 };
      row.count += 1;
      row.total += t.total;
      byEmployee.set(t.employee, row);
    }

    const data = Array.from(byEmployee.values()).sort((a, b) => b.total - a.total);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
