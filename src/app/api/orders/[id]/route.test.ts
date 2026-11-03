import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { outlets, servicePackages, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { createOrder } from "@/lib/services/orders";
import { GET, PATCH } from "./route";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

describe("/api/orders/[id]", () => {
  let db: AppDatabase;
  let outletId: string;
  let adminCookie: string;
  let orderId: string;

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
      .values({ name: "Outlet Uji Order" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    adminCookie = await signUp("admin-order@contoh.id", "Admin Order");

    const [adminUser] = await db
      .update(userTable)
      .set({ role: "admin", outletId })
      .where(eq(userTable.email, "admin-order@contoh.id"))
      .returning();

    const [pkg] = await db
      .insert(servicePackages)
      .values({
        outletId,
        name: "Paket Motor Basic",
        vehicleType: "motor",
        price: 20000,
        durationMin: 15,
        active: true,
      })
      .returning();

    const created = await createOrder(
      db,
      outletId,
      {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
        outletId,
        phone: "",
        dailyRate: 0,
        active: true,
      },
      {
        vehicleType: "motor",
        packageId: pkg.id,
        customerName: "Budi",
        addons: [],
        customerPhone: "",
        plate: "",
      },
    );
    orderId = created.id;
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("GET mengembalikan detail order", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await GET(new Request(`http://localhost/api/orders/${orderId}`), {
      params: Promise.resolve({ id: orderId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.id).toBe(orderId);
    expect(body.data.customerName).toBe("Budi");
  });

  it("PATCH memperbarui data order", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const request = new Request(`http://localhost/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customerName: "Budi Santoso" }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: orderId }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.customerName).toBe("Budi Santoso");
  });
});
