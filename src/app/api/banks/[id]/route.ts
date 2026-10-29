import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { bankUpdateSchema } from "@/lib/schemas";
import { updateBank } from "@/lib/services/banks";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const user = await requireUser(["admin"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = bankUpdateSchema.parse(body);
    const data = await updateBank(getDatabase(), id, input, user.outletId);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
