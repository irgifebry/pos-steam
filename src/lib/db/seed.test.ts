import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "./test-db";
import { addons, banks, outlets, servicePackages, user as userTable } from "./schema";
import type { AppDatabase } from "./schema";
import { createAuth } from "@/lib/auth/config";
import { seed } from "./seed";

describe("seed", () => {
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

  it("menjalankan seed dua kali tanpa menduplikasi data", async () => {
    await seed(db, auth);
    await seed(db, auth);

    const outletRows = await db.select().from(outlets);
    expect(outletRows).toHaveLength(1);

    // Tidak ada data contoh: master data diisi admin lewat UI.
    expect(await db.select().from(servicePackages)).toHaveLength(0);
    expect(await db.select().from(addons)).toHaveLength(0);
    expect(await db.select().from(banks)).toHaveLength(0);

    // Hanya satu akun demo yang dibuat seed.
    const users = await db.select().from(userTable);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("admin@pos.test");
    expect(users[0].role).toBe("admin");
  });

  it("admin hasil seed bisa login dengan PIN demo", async () => {
    const result = await auth.api.signInEmail({
      body: { email: "admin@pos.test", password: "123456" },
    });
    expect(result.token).toBeTruthy();
  });
});
