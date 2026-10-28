import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { bankInputSchema } from "@/lib/schemas";
import { createBank, listBanks } from "@/lib/services/banks";
import { initializeServer } from "@/lib/server-init";

export async function GET() {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir", "operator"]);
    const data = user.outletId ? await listBanks(getDatabase(), user.outletId) : [];
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin"]);

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = bankInputSchema.parse(body);
    const data = await createBank(getDatabase(), user.outletId ?? "", input);

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
