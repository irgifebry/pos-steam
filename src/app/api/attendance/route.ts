import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { attendanceSaveSchema } from "@/lib/schemas";
import { listAttendance, saveAttendance } from "@/lib/services/attendance";
import { jakartaDate } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir", "operator"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const date = new URL(request.url).searchParams.get("date") || jakartaDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Format tanggal tidak valid");
    }
    const data = await listAttendance(getDatabase(), user.outletId, date);
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
    const input = attendanceSaveSchema.parse(body);
    const data = await saveAttendance(getDatabase(), user.outletId, user.id, input);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
