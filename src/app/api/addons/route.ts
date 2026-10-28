import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { addonInputSchema } from "@/lib/schemas";
import { createAddon, listAddons } from "@/lib/services/addons";
import { initializeServer } from "@/lib/server-init";
import type { VehicleType } from "@/lib/types";

function parseVehicleType(value: string | null): VehicleType | undefined {
  if (value === null || value === "") return undefined;
  if (value === "motor" || value === "mobil") return value;
  throw new HttpError(400, "VALIDATION_ERROR", "Tipe kendaraan tidak valid");
}

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    const url = new URL(request.url);

    const data = await listAddons(getDatabase(), {
      outletId: user.outletId ?? undefined,
      vehicleType: parseVehicleType(url.searchParams.get("vehicleType")),
      includeInactive: url.searchParams.get("includeInactive") === "true",
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
    const input = addonInputSchema.parse(body);
    const data = await createAddon(getDatabase(), user.outletId ?? "", input);

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
