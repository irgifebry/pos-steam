import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/provider";
import { HttpError, jsonError } from "@/lib/http";
import { reportRangeSchema } from "@/lib/schemas";
import { listReportTransactions } from "@/lib/services/reports";
import { initializeServer } from "@/lib/server-init";

type ExportType = "transactions" | "paket" | "addon" | "payment-method" | "employee";

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(type: ExportType, transactions: Awaited<ReturnType<typeof listReportTransactions>>): string {
  const rows: Array<(string | number)[]> = [];

  switch (type) {
    case "transactions":
      rows.push([
        "id",
        "invoiceNo",
        "date",
        "queueNo",
        "vehicleType",
        "paymentMethod",
        "packageName",
        "addons",
        "employee",
        "total",
        "customerName",
        "plate",
      ]);
      for (const t of transactions) {
        rows.push([
          t.id,
          t.invoiceNo,
          t.date,
          t.queueNo,
          t.vehicleType,
          t.paymentMethod,
          t.packageName,
          t.addons.map((a) => `${a.name} (x${a.qty})`).join("; "),
          t.employee,
          t.total,
          t.customerName,
          t.plate,
        ]);
      }
      break;
    case "paket": {
      rows.push(["packageName", "count", "total"]);
      const byPackage = new Map<string, { count: number; total: number }>();
      for (const t of transactions) {
        const row = byPackage.get(t.packageName) ?? { count: 0, total: 0 };
        row.count += 1;
        row.total += t.total;
        byPackage.set(t.packageName, row);
      }
      for (const [packageName, row] of byPackage) {
        rows.push([packageName, row.count, row.total]);
      }
      break;
    }
    case "addon": {
      rows.push(["addonName", "qty", "count", "total"]);
      const byAddon = new Map<string, { qty: number; count: number; total: number }>();
      for (const t of transactions) {
        for (const addon of t.addons) {
          const row = byAddon.get(addon.name) ?? { qty: 0, count: 0, total: 0 };
          row.qty += addon.qty;
          row.count += 1;
          row.total += addon.subtotal;
          byAddon.set(addon.name, row);
        }
      }
      for (const [addonName, row] of byAddon) {
        rows.push([addonName, row.qty, row.count, row.total]);
      }
      break;
    }
    case "payment-method": {
      rows.push(["paymentMethod", "count", "total"]);
      const byMethod = new Map<string, { count: number; total: number }>();
      for (const t of transactions) {
        const row = byMethod.get(t.paymentMethod) ?? { count: 0, total: 0 };
        row.count += 1;
        row.total += t.total;
        byMethod.set(t.paymentMethod, row);
      }
      for (const [paymentMethod, row] of byMethod) {
        rows.push([paymentMethod, row.count, row.total]);
      }
      break;
    }
    case "employee": {
      rows.push(["employee", "count", "total"]);
      const byEmployee = new Map<string, { count: number; total: number }>();
      for (const t of transactions) {
        const row = byEmployee.get(t.employee) ?? { count: 0, total: 0 };
        row.count += 1;
        row.total += t.total;
        byEmployee.set(t.employee, row);
      }
      for (const [employee, row] of byEmployee) {
        rows.push([employee, row.count, row.total]);
      }
      break;
    }
  }

  return "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export async function GET(request: Request) {
  try {
    await initializeServer();
    const user = await requireUser(["admin", "kasir"]);
    if (!user.outletId) {
      throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
    }

    const url = new URL(request.url);
    const range = reportRangeSchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    if (range.from > range.to) {
      throw new HttpError(400, "VALIDATION_ERROR", "Tanggal awal harus sebelum tanggal akhir");
    }

    const type = url.searchParams.get("type");
    if (
      type !== "transactions" &&
      type !== "paket" &&
      type !== "addon" &&
      type !== "payment-method" &&
      type !== "employee"
    ) {
      throw new HttpError(400, "VALIDATION_ERROR", "Tipe ekspor tidak valid");
    }

    const transactions = await listReportTransactions(
      getDatabase(),
      user.outletId,
      range.from,
      range.to,
    );

    const body = buildCsv(type, transactions);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${type}.csv"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
