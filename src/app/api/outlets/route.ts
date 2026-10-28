import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { outletUpdateSchema } from "@/lib/schemas";
import { listOutlets, updateOutlet } from "@/lib/services/outlets";
import { initializeServer } from "@/lib/server-init";

export async function GET() {
  try {
    await initializeServer();
    await requireUser(["admin", "kasir", "operator"]);
    const data = await listOutlets(getDatabase());
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = outletUpdateSchema.parse(body);
    const data = await updateOutlet(getDatabase(), user.outletId, input);

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
