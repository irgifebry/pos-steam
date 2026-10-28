import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "./config";

describe("Better Auth", () => {
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
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("membuat user baru dengan role default kasir dan active true", async () => {
    const result = await auth.api.signUpEmail({
      body: { email: "budi@contoh.id", password: "123456", name: "Budi" },
    });
    expect(result.user.role).toBe("kasir");
    expect(result.user.active).toBe(true);
    expect(result.user.dailyRate).toBe(0);
  });

  it("menolak password yang lebih pendek dari 6 karakter", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email: "kecil@contoh.id", password: "12345", name: "Kecil" },
      }),
    ).rejects.toBeDefined();
  });

  it("membuat sesi yang bisa dibaca ulang lewat getSession", async () => {
    const signIn = await auth.api.signInEmail({
      body: { email: "budi@contoh.id", password: "123456" },
      returnHeaders: true,
    });
    expect(signIn.response?.token).toBeTruthy();
    const setCookie = signIn.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    const cookie = setCookie.split(";")[0];
    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session?.user.email).toBe("budi@contoh.id");
  });
});
