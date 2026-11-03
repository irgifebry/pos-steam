import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { getTodayDashboard } from "@/lib/services/reports";
import { initializeServer } from "@/lib/server-init";

export async function GET() {
  try {
    await initializeServer();
    const user = await requireUser();
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const data = await getTodayDashboard(getDatabase(), user.outletId);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
