import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { attendanceSummary } from "@/lib/services/attendance";
import { initializeServer } from "@/lib/server-init";

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const period = new URL(request.url).searchParams.get("period");
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Format periode tidak valid");
    }

    const data = await attendanceSummary(getDatabase(), user.outletId, period);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
