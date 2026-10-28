import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { userUpdateSchema } from "@/lib/schemas";
import { updateUser } from "@/lib/services/users";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const actor = await requireUser(["admin"]);
    const { id } = await params;

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = userUpdateSchema.parse(body);
    const data = await updateUser(getDatabase(), id, input, actor.id);

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
