import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { listAuditLogs } from "@/lib/services/audit";
import { initializeServer } from "@/lib/server-init";

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser();
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const entity = url.searchParams.get("entity") ?? undefined;

    const limit = limitParam ? Math.min(100, Math.max(1, Number(limitParam) || 50)) : 50;
    const offset = offsetParam ? Math.max(0, Number(offsetParam) || 0) : 0;

    const data = await listAuditLogs(getDatabase(), user.outletId, {
      limit,
      offset,
      entity,
    });

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
