import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, session as sessionTable, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { getSessionUser } from "@/lib/auth/session";
import {
  createUser,
  listUserSummaries,
  listUsers,
  resetPin,
  setUserActive,
  updateUser,
} from "./users";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

async function signIn(
  auth: ReturnType<typeof createAuth>,
  email: string,
  password: string,
): Promise<string> {
  const result = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  return (result.headers.get("set-cookie") ?? "").split(";")[0];
}

describe("users", () => {
  let db: AppDatabase;
  let auth: ReturnType<typeof createAuth>;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    process.env.BETTER_AUTH_SECRET = "x".repeat(40);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.WEB_ORIGIN = "http://localhost:3000";
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    db = await createTestDatabase();
    auth = createAuth(db, { nextCookies: false });
    setDatabase(db);
    setAuth(auth);
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("membuat pengguna baru dengan role yang diminta dan PIN terenkripsi", async () => {
    const user = await createUser(db, auth, {
      name: "Siti",
      email: "siti@contoh.id",
      password: "112233",
      role: "kasir",
      phone: "",
      dailyRate: 50000,
      active: true,
    });

    expect(user.role).toBe("kasir");
    expect(user.dailyRate).toBe(50000);

    const row = await db.select().from(userTable).where(eq(userTable.email, "siti@contoh.id"));
    expect(JSON.stringify(row)).not.toContain("112233");

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, "user.create"));
    expect(logs.length).toBeGreaterThan(0);
  });

  it("membuat pengguna dengan role admin", async () => {
    const user = await createUser(db, auth, {
      name: "Budi",
      email: "budi-admin@contoh.id",
      password: "445566",
      role: "admin",
      phone: "",
      dailyRate: 0,
      active: true,
    });
    expect(user.role).toBe("admin");
  });

  it("menolak email yang sudah terdaftar", async () => {
    await expect(
      createUser(db, auth, {
        name: "Ganda",
        email: "siti@contoh.id",
        password: "778899",
        role: "kasir",
        phone: "",
        dailyRate: 0,
        active: true,
      }),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE" });
  });

  it("menonaktifkan user sehingga sesi lama tidak berlaku", async () => {
    const cookie = await signIn(auth, "siti@contoh.id", "112233");
    const [row] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, "siti@contoh.id"));

    await setUserActive(db, row.id, false);

    const sessions = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.userId, row.id));
    expect(sessions).toHaveLength(0);

    state.headers = new Headers({ cookie });
    expect(await getSessionUser()).toBeNull();
  });

  it("mengganti PIN user lewat reset admin", async () => {
    const [row] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, "siti@contoh.id"));

    await resetPin(db, auth, row.id, "998877");
    await setUserActive(db, row.id, true);

    await expect(
      auth.api.signInEmail({ body: { email: "siti@contoh.id", password: "112233" } }),
    ).rejects.toBeDefined();

    const signInResult = await auth.api.signInEmail({
      body: { email: "siti@contoh.id", password: "998877" },
    });
    expect(signInResult.token).toBeTruthy();
  });

  it("tidak bisa mengubah role admin terakhir menjadi non-admin", async () => {
    const [admin] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, "budi-admin@contoh.id"));

    await expect(updateUser(db, admin.id, { role: "kasir" })).rejects.toMatchObject({
      status: 409,
      code: "LAST_ADMIN",
    });
  });

  it("memperbarui data user dan mencatat audit log", async () => {
    const [row] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, "siti@contoh.id"));

    const updated = await updateUser(db, row.id, { phone: "08123456789", dailyRate: 60000 });
    expect(updated.phone).toBe("08123456789");
    expect(updated.dailyRate).toBe(60000);

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, "user.update"));
    expect(logs.length).toBeGreaterThan(0);
  });

  it("mendaftar user lengkap dan ringkasan tanpa data gaji", async () => {
    const all = await listUsers(db, { includeInactive: true });
    expect(all.length).toBe(2);

    const summaries = await listUserSummaries(db);
    expect(summaries.length).toBeGreaterThan(0);
    expect(Object.keys(summaries[0]).sort()).toEqual(["id", "name", "role"]);
  });
});
