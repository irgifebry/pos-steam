import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { getOrder } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir", "operator"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }
    const { id } = await params;
    const data = await getOrder(getDatabase(), id, user.outletId);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
