import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { syncBatchSchema } from "@/lib/schemas";
import { processSyncBatch } from "@/lib/services/sync";
import { initializeServer } from "@/lib/server-init";

export async function POST(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser();
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "INVALID_JSON", "Format JSON tidak valid");
    }

    const batch = syncBatchSchema.parse(body);
    const data = await processSyncBatch(getDatabase(), user.outletId, user, batch);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
