import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { createAuth } from "./config";
import { setAuth } from "./provider";
import { getSessionUser, requireUser } from "./session";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

async function signInCookie(
  auth: ReturnType<typeof createAuth>,
  email: string,
  password: string,
): Promise<string> {
  const result = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const setCookie = result.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}

describe("session guard", () => {
  let db: AppDatabase;
  let auth: ReturnType<typeof createAuth>;
  let kasirCookie: string;

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

    await auth.api.signUpEmail({
      body: { email: "budi@contoh.id", password: "123456", name: "Budi" },
    });
    kasirCookie = await signInCookie(auth, "budi@contoh.id", "123456");
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengembalikan null saat tidak ada sesi", async () => {
    state.headers = new Headers();
    expect(await getSessionUser()).toBeNull();
  });

  it("melempar 401 UNAUTHENTICATED dari requireUser tanpa sesi", async () => {
    state.headers = new Headers();
    await expect(requireUser()).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("mengembalikan user yang sedang login", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    const sessionUser = await getSessionUser();
    expect(sessionUser?.email).toBe("budi@contoh.id");
    expect(sessionUser?.role).toBe("kasir");
    expect(sessionUser?.active).toBe(true);
  });

  it("melempar 403 FORBIDDEN bila role tidak diizinkan", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    await expect(requireUser(["admin"])).rejects.toBeInstanceOf(HttpError);
    await expect(requireUser(["admin"])).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("mengembalikan null bila user.active bernilai false", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    await db.update(userTable).set({ active: false }).where(eq(userTable.email, "budi@contoh.id"));
    expect(await getSessionUser()).toBeNull();
    await db.update(userTable).set({ active: true }).where(eq(userTable.email, "budi@contoh.id"));
  });
});
