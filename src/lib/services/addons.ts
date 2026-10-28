import { and, asc, eq } from "drizzle-orm";
import { addons } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError, isUniqueViolation } from "@/lib/http";
import { addonInputSchema, addonUpdateSchema } from "@/lib/schemas";
import type { AddonInput, AddonUpdate, VehicleType } from "@/lib/types";

export type Addon = {
  id: string;
  outletId: string;
  name: string;
  price: number;
  unitLabel: string;
  vehicleTypes: VehicleType[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AddonRow = typeof addons.$inferSelect;

function toDomain(row: AddonRow): Addon {
  return {
    ...row,
    vehicleTypes: row.vehicleTypes as VehicleType[],
  };
}

export async function listAddons(
  db: AppDatabase,
  opts: { outletId?: string; vehicleType?: VehicleType; includeInactive?: boolean } = {},
): Promise<Addon[]> {
  const filters = [
    opts.outletId ? eq(addons.outletId, opts.outletId) : undefined,
    opts.includeInactive ? undefined : eq(addons.active, true),
  ].filter((filter) => filter !== undefined);

  const rows = await db
    .select()
    .from(addons)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(addons.name));

  const mapped = rows.map(toDomain);
  if (!opts.vehicleType) return mapped;
  return mapped.filter((row) => row.vehicleTypes.includes(opts.vehicleType as VehicleType));
}

export async function createAddon(
  db: AppDatabase,
  outletId: string,
  input: AddonInput,
): Promise<Addon> {
  const data = addonInputSchema.parse(input);
  if (!outletId) {
    throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
  }

  try {
    const [row] = await db
      .insert(addons)
      .values({ ...data, outletId })
      .returning();
    return toDomain(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "DUPLICATE", "Add-on dengan nama itu sudah ada");
    }
    throw error;
  }
}

export async function updateAddon(
  db: AppDatabase,
  id: string,
  input: AddonUpdate,
): Promise<Addon> {
  const data = addonUpdateSchema.parse(input);

  const values: Partial<typeof addons.$inferInsert> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.price !== undefined) values.price = data.price;
  if (data.unitLabel !== undefined) values.unitLabel = data.unitLabel;
  if (data.vehicleTypes !== undefined) values.vehicleTypes = data.vehicleTypes;
  if (data.active !== undefined) values.active = data.active;

  const [existing] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Add-on tidak ditemukan");
  }
  if (Object.keys(values).length === 0) {
    return toDomain(existing);
  }

  try {
    const [row] = await db.update(addons).set(values).where(eq(addons.id, id)).returning();
    return toDomain(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "DUPLICATE", "Add-on dengan nama itu sudah ada");
    }
    throw error;
  }
}

export async function deactivateAddon(db: AppDatabase, id: string): Promise<void> {
  const updated = await db
    .update(addons)
    .set({ active: false })
    .where(eq(addons.id, id))
    .returning({ id: addons.id });

  if (updated.length === 0) {
    throw new HttpError(404, "NOT_FOUND", "Add-on tidak ditemukan");
  }
}
