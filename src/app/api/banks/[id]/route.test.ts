import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { banks, outlets, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { PATCH } from "./route";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

describe("PATCH /api/banks/[id]", () => {
  let db: AppDatabase;
  let outletId: string;
  let adminCookie: string;
  let testBankId: string;

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
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    db = await createTestDatabase();
    const auth = createAuth(db, { nextCookies: false });
    setDatabase(db);
    setAuth(auth);

    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Test Bank" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    adminCookie = await signUp("admin-bank@contoh.id", "Admin Bank");

    await db
      .update(userTable)
      .set({ role: "admin", outletId })
      .where(eq(userTable.email, "admin-bank@contoh.id"));

    const [bank] = await db
      .insert(banks)
      .values({
        outletId,
        name: "BCA Lama",
        accountNumber: "123456",
        accountName: "PT Test",
        active: true,
      })
      .returning();
    testBankId = bank.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengembalikan 401 tanpa sesi", async () => {
    state.headers = new Headers();
    const request = new Request(`http://localhost/api/banks/${testBankId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "BCA Baru" }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: testBankId }),
    });
    expect(response.status).toBe(401);
  });

  it("memperbarui bank milik outlet user", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const request = new Request(`http://localhost/api/banks/${testBankId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "BCA Diperbarui",
        active: false,
      }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: testBankId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.name).toBe("BCA Diperbarui");
    expect(body.data.active).toBe(false);
  });
});
