import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { servicePackageUpdateSchema } from "@/lib/schemas";
import {
  deactivateServicePackage,
  updateServicePackage,
} from "@/lib/services/service-packages";
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
    const input = servicePackageUpdateSchema.parse(body);
    const data = await updateServicePackage(getDatabase(), id, input);

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

    await deactivateServicePackage(getDatabase(), id);

    return Response.json({ data: { id } });
  } catch (error) {
    return jsonError(error);
  }
}
