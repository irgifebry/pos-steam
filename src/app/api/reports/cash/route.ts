import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { jakartaDate } from "@/lib/services/orders";
import { getCashShiftState } from "@/lib/services/cash-shifts";
import { listReportTransactions } from "@/lib/services/reports";
import { initializeServer } from "@/lib/server-init";

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date") || jakartaDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Format tanggal tidak valid");
    }

    const state = await getCashShiftState(getDatabase(), user.outletId);

    const transactions = await listReportTransactions(
      getDatabase(),
      user.outletId,
      date,
      date,
    );
    const totalTunai = transactions
      .filter((t) => t.paymentMethod === "Tunai")
      .reduce((sum, t) => sum + t.total, 0);

    const open = state.open;
    const expectedCash = open?.expectedCash ?? 0;

    return Response.json({
      data: {
        date,
        open,
        history: state.history,
        expectedCash,
        totalTunai,
        selisih: totalTunai - expectedCash,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
