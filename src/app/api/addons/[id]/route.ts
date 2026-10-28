import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { addonUpdateSchema } from "@/lib/schemas";
import { deactivateAddon, updateAddon } from "@/lib/services/addons";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    await requireUser(["admin"]);
    const { id } = await params;

    const body = await request.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Body permintaan tidak valid");
    });
    const input = addonUpdateSchema.parse(body);
    const data = await updateAddon(getDatabase(), id, input);

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    await requireUser(["admin"]);
    const { id } = await params;

    await deactivateAddon(getDatabase(), id);

    return Response.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
