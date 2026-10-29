import { getAuth } from "@/lib/auth/provider";
import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { userCreateSchema } from "@/lib/schemas";
import { createUser, listUserSummaries, listUsers } from "@/lib/services/users";
import { initializeServer } from "@/lib/server-init";

export async function GET(request: Request) {
  try {
    await initializeServer();
    const url = new URL(request.url);
    const light = url.searchParams.get("light") === "1";

    if (light) {
      const user = await requireUser(["admin", "kasir"]);
      const data = await listUserSummaries(getDatabase(), user.outletId ?? undefined);
      return Response.json({ data });
    }

    const user = await requireUser(["admin"]);
    const includeInactive = url.searchParams.get("includeInactive") !== "false";
    const data = await listUsers(getDatabase(), {
      includeInactive,
      outletId: user.outletId ?? undefined,
    });
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
    const input = userCreateSchema.parse(body);
    const data = await createUser(
      getDatabase(),
      getAuth(),
      { ...input, outletId: user.outletId },
      user.id,
    );

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
