import { and, eq } from "drizzle-orm";
import { outlets, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { settingsUpdateSchema } from "@/lib/schemas";
import type { SettingsUpdate } from "@/lib/types";
import { listBanks } from "./banks";
import type { Bank } from "./banks";
import { getOutlet } from "./outlets";
import type { Outlet } from "./outlets";

export type Settings = {
  outlet: Outlet;
  banks: Bank[];
  defaultDailyRate: number;
};

async function resolveDefaultDailyRate(db: AppDatabase, outletId: string): Promise<number> {
  const rows = await db
    .select({ dailyRate: userTable.dailyRate })
    .from(userTable)
    .where(and(eq(userTable.outletId, outletId), eq(userTable.active, true)));

  const counts = new Map<number, number>();
  for (const { dailyRate } of rows) {
    if (dailyRate <= 0) continue;
    counts.set(dailyRate, (counts.get(dailyRate) ?? 0) + 1);
  }

  let best = 0;
  let bestCount = 0;
  for (const [rate, count] of counts) {
    if (count > bestCount || (count === bestCount && rate > best)) {
      best = rate;
      bestCount = count;
    }
  }
  return best;
}

export async function getSettings(db: AppDatabase, outletId: string): Promise<Settings> {
  const outlet = await getOutlet(db, outletId);
  if (!outlet) {
    throw new HttpError(404, "NOT_FOUND", "Outlet tidak ditemukan");
  }

  const [banks, fallbackDailyRate] = await Promise.all([
    listBanks(db, outletId),
    resolveDefaultDailyRate(db, outletId),
  ]);

  return {
    outlet,
    banks,
    defaultDailyRate: outlet.defaultDailyRate > 0 ? outlet.defaultDailyRate : fallbackDailyRate,
  };
}

export async function updateSettings(
  db: AppDatabase,
  outletId: string,
  input: SettingsUpdate,
): Promise<Settings> {
  const data = settingsUpdateSchema.parse(input);
  const updated = await db
    .update(outlets)
    .set({ defaultDailyRate: data.defaultDailyRate })
    .where(eq(outlets.id, outletId))
    .returning({ id: outlets.id });

  if (updated.length === 0) {
    throw new HttpError(404, "NOT_FOUND", "Outlet tidak ditemukan");
  }

  return getSettings(db, outletId);
}
