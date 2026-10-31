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

    const packageRows = await db.select().from(servicePackages);
    expect(packageRows).toHaveLength(6);

    const addonRows = await db.select().from(addons);
    expect(addonRows).toHaveLength(4);

    const bankRows = await db.select().from(banks);
    expect(bankRows).toHaveLength(3);

    const adminRows = await db.select().from(userTable).where(eq(userTable.email, "admin@pos.test"));
    expect(adminRows).toHaveLength(1);
    expect(adminRows[0].role).toBe("admin");
  });

  it("admin hasil seed bisa login dengan PIN demo", async () => {
    const result = await auth.api.signInEmail({
      body: { email: "admin@pos.test", password: "123456" },
    });
    expect(result.token).toBeTruthy();
  });
});
