import { getDatabase } from "@/lib/db/provider";
import { jsonError } from "@/lib/http";
import { getReceipt } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await initializeServer();
    const { token } = await params;
    const data = await getReceipt(getDatabase(), token);
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
