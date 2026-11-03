import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { outlets, servicePackages, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { GET as getBootstrap } from "./bootstrap/route";
import { POST as postBatch } from "./batch/route";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

describe("Sync API Routes (/api/sync/*)", () => {
  let db: AppDatabase;
  let outletId: string;
  let adminCookie: string;
  let packageId: string;

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
      .values({ name: "Outlet Uji Sync Route" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    adminCookie = await signUp("admin-sync@contoh.id", "Admin Sync");

    await db
      .update(userTable)
      .set({ role: "admin", outletId })
      .where(eq(userTable.email, "admin-sync@contoh.id"));

    const [pkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Paket Cuci Sync",
        vehicleType: "motor",
        price: 15000,
        durationMin: 15,
        active: true,
      })
      .returning();
    packageId = pkg.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("GET /api/sync/bootstrap mengembalikan master data dan counter awal", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await getBootstrap();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.outlet.id).toBe(outletId);
    expect(body.data.packages.length).toBe(1);
    expect(body.data.todayCounters).toBeDefined();
  });

  it("POST /api/sync/batch memproses order baru dari antrean offline", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const clientId = randomUUID();
    const request = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            type: "order.create",
            clientId,
            payload: {
              clientId,
              vehicleType: "motor",
              packageId,
              customerName: "Offline Driver",
              addons: [],
              customerPhone: "",
              plate: "B 1234 OFFLINE",
            },
          },
        ],
      }),
    });

    const response = await postBatch(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.processed).toBe(1);
    expect(body.data.results[0].success).toBe(true);
  });
});
