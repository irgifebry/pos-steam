import { and, asc, count, eq, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { account, auditLogs, session, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import type { Auth } from "@/lib/auth/config";
import { HttpError } from "@/lib/http";
import {
  userCreateSchema,
  userUpdateSchema,
  pinSchema,
  roleSchema,
} from "@/lib/schemas";
import type { Role, UserCreate, UserUpdate } from "@/lib/types";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  outletId: string | null;
  dailyRate: number;
  active: boolean;
  createdAt: Date;
};

export type AppUserSummary = {
  id: string;
  name: string;
  role: Role;
};

type UserRow = typeof userTable.$inferSelect;

function toDomain(row: UserRow): AppUser {
  const role = roleSchema.safeParse(row.role);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: role.success ? role.data : "kasir",
    phone: row.phone ?? "",
    outletId: row.outletId,
    dailyRate: row.dailyRate,
    active: row.active,
    createdAt: row.createdAt,
  };
}

async function recordAudit(
  db: AppDatabase,
  entry: {
    outletId: string | null;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await db.insert(auditLogs).values({
    outletId: entry.outletId,
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}

async function countOtherActiveAdmins(db: AppDatabase, excludeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(userTable)
    .where(
      and(
        eq(userTable.role, "admin"),
        eq(userTable.active, true),
        ne(userTable.id, excludeId),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function listUsers(
  db: AppDatabase,
  opts: { includeInactive?: boolean; outletId?: string } = {},
): Promise<AppUser[]> {
  const filters = [
    opts.includeInactive ? undefined : eq(userTable.active, true),
    opts.outletId ? eq(userTable.outletId, opts.outletId) : undefined,
  ].filter((filter) => filter !== undefined);

  const rows = await db
    .select()
    .from(userTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(userTable.name));

  return rows.map(toDomain);
}

export async function listUserSummaries(
  db: AppDatabase,
  outletId?: string,
): Promise<AppUserSummary[]> {
  const filters = [
    eq(userTable.active, true),
    outletId ? eq(userTable.outletId, outletId) : undefined,
  ].filter((filter) => filter !== undefined);

  const rows = await db
    .select({ id: userTable.id, name: userTable.name, role: userTable.role })
    .from(userTable)
    .where(and(...filters))
    .orderBy(asc(userTable.name));

  return rows.map((row) => {
    const role = roleSchema.safeParse(row.role);
    return { id: row.id, name: row.name, role: role.success ? role.data : "kasir" };
  });
}

export async function createUser(
  db: AppDatabase,
  auth: Auth,
  input: UserCreate & { outletId?: string | null },
  actorId?: string,
): Promise<AppUser> {
  const data = userCreateSchema.parse(input);
  const email = data.email.toLowerCase();

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (existing) {
    throw new HttpError(409, "DUPLICATE", "Email sudah terdaftar");
  }

  const result = await auth.api.signUpEmail({
    body: { name: data.name, email, password: data.password },
    returnHeaders: true,
  });

  const created = result.response?.user;
  if (!created) {
    throw new HttpError(500, "AUTH_FAILED", "Gagal membuat akun pengguna");
  }

  // signUpEmail otomatis membuat sesi untuk admin yang sedang login;
  // sesi itu tidak boleh dipakai, jadi langsung dihapus.
  await db.delete(session).where(eq(session.userId, created.id));

  const [row] = await db
    .update(userTable)
    .set({
      role: data.role,
      phone: data.phone,
      outletId: input.outletId ?? null,
      dailyRate: data.dailyRate,
      active: data.active,
    })
    .where(eq(userTable.id, created.id))
    .returning();

  const user = toDomain(row);
  await recordAudit(db, {
    outletId: user.outletId,
    userId: actorId ?? null,
    action: "user.create",
    entity: "user",
    entityId: user.id,
    after: { name: user.name, email: user.email, role: user.role },
  });

  return user;
}

export async function updateUser(
  db: AppDatabase,
  id: string,
  input: UserUpdate,
  actorId?: string,
): Promise<AppUser> {
  const data = userUpdateSchema.parse(input);

  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Pengguna tidak ditemukan");
  }

  if (
    existing.role === "admin" &&
    data.role !== undefined &&
    data.role !== "admin" &&
    (await countOtherActiveAdmins(db, id)) === 0
  ) {
    throw new HttpError(409, "LAST_ADMIN", "Minimal harus ada satu admin aktif");
  }

  const values: Partial<typeof userTable.$inferInsert> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.email !== undefined) values.email = data.email.toLowerCase();
  if (data.role !== undefined) values.role = data.role;
  if (data.phone !== undefined) values.phone = data.phone;
  if (data.dailyRate !== undefined) values.dailyRate = data.dailyRate;
  if (data.active !== undefined) values.active = data.active;

  const [row] = await db
    .update(userTable)
    .set(values)
    .where(eq(userTable.id, id))
    .returning();

  if (data.active === false) {
    await db.delete(session).where(eq(session.userId, id));
  }

  const user = toDomain(row);
  await recordAudit(db, {
    outletId: user.outletId,
    userId: actorId ?? null,
    action: "user.update",
    entity: "user",
    entityId: user.id,
    before: {
      name: existing.name,
      role: existing.role,
      phone: existing.phone,
      dailyRate: existing.dailyRate,
      active: existing.active,
    },
    after: {
      name: user.name,
      role: user.role,
      phone: user.phone,
      dailyRate: user.dailyRate,
      active: user.active,
    },
  });

  return user;
}

export async function resetPin(
  db: AppDatabase,
  _auth: Auth,
  id: string,
  newPassword: string,
  actorId?: string,
): Promise<void> {
  const password = pinSchema.parse(newPassword);

  const [existing] = await db
    .select({ id: userTable.id, outletId: userTable.outletId })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Pengguna tidak ditemukan");
  }

  const passwordHash = await hashPassword(password);
  const updated = await db
    .update(account)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
    .returning({ id: account.id });

  if (updated.length === 0) {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: passwordHash,
    });
  }

  await db.delete(session).where(eq(session.userId, id));
  await recordAudit(db, {
    outletId: existing.outletId,
    userId: actorId ?? null,
    action: "user.reset_pin",
    entity: "user",
    entityId: id,
  });
}

export async function setUserActive(
  db: AppDatabase,
  id: string,
  active: boolean,
  actorId?: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (!existing) {
    throw new HttpError(404, "NOT_FOUND", "Pengguna tidak ditemukan");
  }

  if (!active && existing.role === "admin" && (await countOtherActiveAdmins(db, id)) === 0) {
    throw new HttpError(409, "LAST_ADMIN", "Minimal harus ada satu admin aktif");
  }

  await db.update(userTable).set({ active }).where(eq(userTable.id, id));
  if (!active) {
    await db.delete(session).where(eq(session.userId, id));
  }

  await recordAudit(db, {
    outletId: existing.outletId,
    userId: actorId ?? null,
    action: active ? "user.activate" : "user.deactivate",
    entity: "user",
    entityId: id,
    before: { active: existing.active },
    after: { active },
  });
}
