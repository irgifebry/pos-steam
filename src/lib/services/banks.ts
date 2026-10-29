import { and, asc, eq } from "drizzle-orm";
import { banks } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { bankInputSchema, bankUpdateSchema } from "@/lib/schemas";
import type { BankInput, BankUpdate } from "@/lib/types";

export type Bank = {
  id: string;
  outletId: string;
  name: string;
  accountNumber: string;
  accountName: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BankRow = typeof banks.$inferSelect;

function toDomain(row: BankRow): Bank {
  return row;
}

export async function listBanks(
  db: AppDatabase,
  outletId: string,
  opts: { includeInactive?: boolean } = {},
): Promise<Bank[]> {
  const filters = [
    eq(banks.outletId, outletId),
    opts.includeInactive ? undefined : eq(banks.active, true),
  ].filter((filter) => filter !== undefined);

  const rows = await db
    .select()
    .from(banks)
    .where(and(...filters))
    .orderBy(asc(banks.name));
  return rows.map(toDomain);
}

export async function createBank(
  db: AppDatabase,
  outletId: string,
  input: BankInput,
): Promise<Bank> {
  const data = bankInputSchema.parse(input);
  if (!outletId) {
    throw new HttpError(400, "OUTLET_REQUIRED", "Pengguna belum terhubung ke outlet");
  }

  const [row] = await db
    .insert(banks)
    .values({ ...data, outletId })
    .returning();
  return toDomain(row);
}

export async function updateBank(
  db: AppDatabase,
  id: string,
  input: BankUpdate,
  outletId?: string,
): Promise<Bank> {
  const data = bankUpdateSchema.parse(input);

  const values: Partial<typeof banks.$inferInsert> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.accountNumber !== undefined) values.accountNumber = data.accountNumber;
  if (data.accountName !== undefined) values.accountName = data.accountName;
  if (data.active !== undefined) values.active = data.active;

  const [existing] = await db
    .select()
    .from(banks)
    .where(
      outletId
        ? and(eq(banks.id, id), eq(banks.outletId, outletId))
        : eq(banks.id, id),
    )
    .limit(1);
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Bank tidak ditemukan");
  }
  if (Object.keys(values).length === 0) {
    return toDomain(existing);
  }

  const [row] = await db.update(banks).set(values).where(eq(banks.id, id)).returning();
  return toDomain(row);
}
