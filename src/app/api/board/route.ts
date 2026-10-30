import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { jakartaDate, listOrders } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

type BoardSummary = { menunggu: number; proses: number; selesai: number; total: number };

export async function GET() {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir", "operator"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const today = jakartaDate();
    const orders = await listOrders(getDatabase(), {
      outletId: user.outletId,
      from: today,
      to: today,
      includePaid: false,
    });
    orders.sort((a, b) => a.queueSeq - b.queueSeq);

    const summary: BoardSummary = { menunggu: 0, proses: 0, selesai: 0, total: 0 };
    for (const order of orders) {
      if (order.status === "menunggu") summary.menunggu += 1;
      else if (order.status === "proses") summary.proses += 1;
      else if (order.status === "selesai") summary.selesai += 1;
      summary.total += 1;
    }

    return Response.json({ data: { orders, summary } });
  } catch (error) {
    return jsonError(error);
  }
}
