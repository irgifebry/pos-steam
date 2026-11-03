import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { orderUpdateSchema } from "@/lib/schemas";
import { getOrder, updateOrder } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const user = await requireUser();
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

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const user = await requireUser();
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "INVALID_JSON", "Format JSON tidak valid");
    }

    const input = orderUpdateSchema.parse(body);
    const data = await updateOrder(getDatabase(), id, user.outletId, user, input);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
