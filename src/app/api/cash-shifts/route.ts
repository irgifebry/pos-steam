import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { cashShiftOpenSchema } from "@/lib/schemas";
import { getCashShiftState, openCashShift } from "@/lib/services/cash-shifts";
import { initializeServer } from "@/lib/server-init";

export async function GET() {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir", "operator"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }
    const data = await getCashShiftState(getDatabase(), user.outletId);
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
    const input = cashShiftOpenSchema.parse(body);
    const data = await openCashShift(getDatabase(), user.outletId, user.id, input);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
