import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { reportRangeSchema } from "@/lib/schemas";
import { getOmzetReport } from "@/lib/services/reports";
import { initializeServer } from "@/lib/server-init";

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

    const rawGroupBy = url.searchParams.get("groupBy") ?? "day";
    const groupBy =
      rawGroupBy === "week" || rawGroupBy === "month" ? rawGroupBy : "day";

    const data = await getOmzetReport(
      getDatabase(),
      user.outletId,
      range.from,
      range.to,
      groupBy,
    );

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
