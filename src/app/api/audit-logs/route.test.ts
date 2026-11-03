import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { outlets, user as userTable, auditLogs } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { GET } from "./route";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

describe("GET /api/audit-logs", () => {
  let db: AppDatabase;
  let outletId: string;
  let adminCookie: string;

  async function signUp(email: string, name: string): Promise<string> {
    const auth = createAuth(db, { nextCookies: false });
    const result = await auth.api.signUpEmail({
      body: { email, password: "123456", name },
      returnHeaders: true,
    });
    return (result.headers.get("set-cookie") ?? "").split(";")[0];
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    process.env.BETTER_AUTH_SECRET = "x".repeat(40);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.WEB_ORIGIN = "http://localhost:3000";

    db = await createTestDatabase();
    const auth = createAuth(db, { nextCookies: false });
    setDatabase(db);
    setAuth(auth);

    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Uji Audit Log" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    adminCookie = await signUp("admin-audit@contoh.id", "Admin Audit");

    const [adminUser] = await db
      .update(userTable)
      .set({ role: "admin", outletId })
      .where(eq(userTable.email, "admin-audit@contoh.id"))
      .returning();

    await db.insert(auditLogs).values({
      outletId,
      userId: adminUser.id,
      action: "user.login",
      entity: "session",
    });
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    state.headers = new Headers();
    const response = await GET(new Request("http://localhost/api/audit-logs"));
    expect(response.status).toBe(401);
  });

  it("mengembalikan daftar audit logs dengan sesi", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await GET(new Request("http://localhost/api/audit-logs"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].action).toBe("user.login");
  });
});
