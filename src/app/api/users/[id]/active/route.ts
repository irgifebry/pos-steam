import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { userActiveSchema } from "@/lib/schemas";
import { setUserActive } from "@/lib/services/users";
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
    const { active } = userActiveSchema.parse(body);
    await setUserActive(getDatabase(), id, active, actor.id);

    return Response.json({ data: { id, active } });
  } catch (error) {
    return jsonError(error);
  }
}
