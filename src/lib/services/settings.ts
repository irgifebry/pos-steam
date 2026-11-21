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
};

export async function getSettings(db: AppDatabase, outletId: string): Promise<Settings> {
  const outlet = await getOutlet(db, outletId);
  if (!outlet) {
    throw new HttpError(404, "NOT_FOUND", "Outlet tidak ditemukan");
  }

  const banks = await listBanks(db, outletId);
  return { outlet, banks };
}

export async function updateSettings(
  db: AppDatabase,
  outletId: string,
  input: SettingsUpdate,
): Promise<Settings> {
  settingsUpdateSchema.parse(input);
  return getSettings(db, outletId);
}
