import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { outlets } from "@/lib/db/schema";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { reportRangeSchema } from "@/lib/schemas";
import { getCashShiftState } from "@/lib/services/cash-shifts";
import { buildReportWorkbook, type ReportExportType } from "@/lib/services/report-export";
import { listReportTransactions } from "@/lib/services/reports";
import { initializeServer } from "@/lib/server-init";

const TYPES: ReportExportType[] = [
  "transactions",
  "paket",
  "addon",
  "payment-method",
  "cash",
];

function isExportType(value: string | null): value is ReportExportType {
  return value !== null && TYPES.includes(value as ReportExportType);
}

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser();
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

    const type = url.searchParams.get("type");
    if (!isExportType(type)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Tipe ekspor tidak valid");
    }

    const db = getDatabase();
    const [outlet] = await db
      .select({ name: outlets.name })
      .from(outlets)
      .where(eq(outlets.id, user.outletId))
      .limit(1);

    const [transactions, cash] = await Promise.all([
      listReportTransactions(db, user.outletId, range.from, range.to),
      getCashShiftState(db, user.outletId).then((state) => [...state.history, ...(state.open ? [state.open] : [])]),
    ]);

    const buffer = await buildReportWorkbook({
      type,
      from: range.from,
      to: range.to,
      outletName: outlet?.name ?? "Outlet",
      transactions,
      cash,
      exportedAt: new Date(),
    });

    const suffix = range.to !== range.from ? `-${range.to}` : "";
    return new Response(Buffer.from(buffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-${type}-${range.from}${suffix}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
