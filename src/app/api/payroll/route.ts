import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { payrollSaveSchema } from "@/lib/schemas";
import { getPayroll, savePayroll } from "@/lib/services/payroll";
import { initializeServer } from "@/lib/server-init";

function requiredPeriod(request: Request): string {
  const period = new URL(request.url).searchParams.get("period");
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Format periode tidak valid");
  }
  return period;
}

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const data = await getPayroll(getDatabase(), user.outletId, requiredPeriod(request));
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = payrollSaveSchema.parse(body);
    const data = await savePayroll(getDatabase(), user.outletId, user.id, input);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
