import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { orderCreateSchema } from "@/lib/schemas";
import { createOrder, jakartaDate, listOrders } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

function requestedRange(request: Request): { from: string; to: string } {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || jakartaDate();
  const from = url.searchParams.get("from") || date;
  const to = url.searchParams.get("to") || date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Format tanggal tidak valid");
  }
  return { from, to };
}

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir", "operator"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const { from, to } = requestedRange(request);
    const includePaid = new URL(request.url).searchParams.get("includePaid") !== "false";
    const data = await listOrders(getDatabase(), {
      outletId: user.outletId,
      from,
      to,
      includePaid,
      limit: 500,
    });

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = orderCreateSchema.parse(body);
    const data = await createOrder(getDatabase(), user.outletId, user, input);

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
