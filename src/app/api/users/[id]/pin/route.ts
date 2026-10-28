import { getAuth } from "@/lib/auth/provider";
import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { pinSchema } from "@/lib/schemas";
import { resetPin } from "@/lib/services/users";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const actor = await requireUser(["admin"]);
    const { id } = await params;

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const password = pinSchema.parse((body as { password?: unknown }).password);
    await resetPin(getDatabase(), getAuth(), id, password, actor.id);

    return Response.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
