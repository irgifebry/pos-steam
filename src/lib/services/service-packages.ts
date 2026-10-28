import { and, asc, eq } from "drizzle-orm";
import { servicePackages } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError, isUniqueViolation } from "@/lib/http";
import { servicePackageInputSchema, servicePackageUpdateSchema } from "@/lib/schemas";
import type { ServicePackageInput, ServicePackageUpdate, VehicleType } from "@/lib/types";

export type ServicePackage = {
  id: string;
  outletId: string;
  name: string;
  vehicleType: VehicleType;
  price: number;
  durationMin: number;
  description: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ServicePackageRow = typeof servicePackages.$inferSelect;

function toDomain(row: ServicePackageRow): ServicePackage {
  return {
    ...row,
    vehicleType: row.vehicleType as VehicleType,
    description: row.description ?? "",
  };
}

export async function listServicePackages(
  db: AppDatabase,
  opts: { outletId?: string; vehicleType?: VehicleType; includeInactive?: boolean } = {},
): Promise<ServicePackage[]> {
  const filters = [
    opts.outletId ? eq(servicePackages.outletId, opts.outletId) : undefined,
    opts.vehicleType ? eq(servicePackages.vehicleType, opts.vehicleType) : undefined,
    opts.includeInactive ? undefined : eq(servicePackages.active, true),
  ].filter((filter) => filter !== undefined);

  const rows = await db
    .select()
    .from(servicePackages)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(servicePackages.sortOrder), asc(servicePackages.name));

  return rows.map(toDomain);
}

export async function createServicePackage(
  db: AppDatabase,
  outletId: string,
  input: ServicePackageInput,
): Promise<ServicePackage> {
  const data = servicePackageInputSchema.parse(input);
  if (!outletId) {
    throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
  }

  try {
    const [row] = await db
      .insert(servicePackages)
      .values({ ...data, outletId })
      .returning();
    return toDomain(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "DUPLICATE", "Paket dengan nama itu sudah ada");
    }
    throw error;
  }
}

export async function updateServicePackage(
  db: AppDatabase,
  id: string,
  input: ServicePackageUpdate,
): Promise<ServicePackage> {
  const data = servicePackageUpdateSchema.parse(input);

  const values: Partial<typeof servicePackages.$inferInsert> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.vehicleType !== undefined) values.vehicleType = data.vehicleType;
  if (data.price !== undefined) values.price = data.price;
  if (data.durationMin !== undefined) values.durationMin = data.durationMin;
  if (data.description !== undefined) values.description = data.description;
  if (data.sortOrder !== undefined) values.sortOrder = data.sortOrder;
  if (data.active !== undefined) values.active = data.active;

  const [existing] = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Paket tidak ditemukan");
  }

  if (Object.keys(values).length === 0) {
    return toDomain(existing);
  }

  try {
    const [row] = await db
      .update(servicePackages)
      .set(values)
      .where(eq(servicePackages.id, id))
      .returning();
    return toDomain(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "DUPLICATE", "Paket dengan nama itu sudah ada");
    }
    throw error;
  }
}

export async function deactivateServicePackage(db: AppDatabase, id: string): Promise<void> {
  const updated = await db
    .update(servicePackages)
    .set({ active: false })
    .where(eq(servicePackages.id, id))
    .returning({ id: servicePackages.id });

  if (updated.length === 0) {
    throw new HttpError(404, "NOT_FOUND", "Paket tidak ditemukan");
  }
}
