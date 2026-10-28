import { asc, eq } from "drizzle-orm";
import { outlets } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { outletUpdateSchema } from "@/lib/schemas";
import type { OutletUpdate } from "@/lib/types";

export type Outlet = {
  id: string;
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  taxPercent: number;
  createdAt: Date;
  updatedAt: Date;
};

type OutletRow = typeof outlets.$inferSelect;

function toDomain(row: OutletRow): Outlet {
  return {
    ...row,
    address: row.address ?? "",
    phone: row.phone ?? "",
    receiptFooter: row.receiptFooter ?? "",
    taxPercent: Number(row.taxPercent),
  };
}

export async function listOutlets(db: AppDatabase): Promise<Outlet[]> {
  const rows = await db.select().from(outlets).orderBy(asc(outlets.name));
  return rows.map(toDomain);
}

export async function getOutlet(db: AppDatabase, id: string): Promise<Outlet | null> {
  const [row] = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  return row ? toDomain(row) : null;
}

export async function updateOutlet(
  db: AppDatabase,
  id: string,
  input: OutletUpdate,
): Promise<Outlet> {
  const data = outletUpdateSchema.parse(input);

  const values: Partial<typeof outlets.$inferInsert> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.address !== undefined) values.address = data.address;
  if (data.phone !== undefined) values.phone = data.phone;
  if (data.receiptFooter !== undefined) values.receiptFooter = data.receiptFooter;
  if (data.taxPercent !== undefined) values.taxPercent = String(data.taxPercent);

  const [existing] = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Outlet tidak ditemukan");
  }
  if (Object.keys(values).length === 0) {
    return toDomain(existing);
  }

  const [row] = await db.update(outlets).set(values).where(eq(outlets.id, id)).returning();
  return toDomain(row);
}
