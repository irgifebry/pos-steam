import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { orderCancelSchema } from "@/lib/schemas";
import { cancelOrder } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const { id } = await params;
    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = orderCancelSchema.parse(body);
    const data = await cancelOrder(getDatabase(), id, user.outletId, user, input);

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
