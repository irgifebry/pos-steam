import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { orders } from "@/lib/db/schema";
import { jakartaDate, listOrders } from "@/lib/services/orders";
import { initializeServer } from "@/lib/server-init";

type BoardSummary = { menunggu: number; proses: number; selesai: number; total: number; cancelled: number };

export async function GET() {
  try {
    await initializeServer();
    const user = await requireUser();
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const today = jakartaDate();
    const db = getDatabase();
    const ordersList = await listOrders(db, {
      outletId: user.outletId,
      from: today,
      to: today,
      includePaid: false,
    });
    ordersList.sort((a, b) => a.queueSeq - b.queueSeq);

    const summary: BoardSummary = { menunggu: 0, proses: 0, selesai: 0, total: 0, cancelled: 0 };
    for (const order of ordersList) {
      if (order.status === "menunggu") summary.menunggu += 1;
      else if (order.status === "proses") summary.proses += 1;
      else if (order.status === "selesai") summary.selesai += 1;
      summary.total += 1;
    }

    // Cancelled orders are excluded from the list above (includePaid=false also
    // excludes `dibatalkan`), so count them separately to keep the paid
    // exclusion for the active list intact.
    const [cancelledRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.outletId, user.outletId),
          eq(orders.businessDate, today),
          eq(orders.status, "dibatalkan"),
        ),
      );
    summary.cancelled = Number(cancelledRow?.count ?? 0);

    return Response.json({ data: { orders: ordersList, summary } });
  } catch (error) {
    return jsonError(error);
  }
}