import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { outlets, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { GET, POST } from "./route";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

describe("/api/packages", () => {
  let db: AppDatabase;
  let outletId: string;
  let adminCookie: string;
  let kasirCookie: string;

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
      .values({ name: "Outlet Uji" })
      .returning({ id: outlets.id });
    outletId = outlet.id;

    adminCookie = await signUp("admin-route@contoh.id", "Admin");
    kasirCookie = await signUp("kasir-route@contoh.id", "Kasir");

    await db
      .update(userTable)
      .set({ role: "admin", outletId })
      .where(eq(userTable.email, "admin-route@contoh.id"));
    await db
      .update(userTable)
      .set({ role: "kasir", outletId })
      .where(eq(userTable.email, "kasir-route@contoh.id"));
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  function postRequest(body: unknown): Request {
    return new Request("http://localhost/api/packages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("mengembalikan 401 tanpa sesi", async () => {
    state.headers = new Headers();
    const response = await GET(new Request("http://localhost/api/packages"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("menolak POST dari role kasir dengan 403", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    const response = await POST(
      postRequest({
        name: "Paket Kasir",
        vehicleType: "motor",
        price: 20000,
        durationMin: 15,
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });

  it("menerima POST dari admin dan mengembalikan 201", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await POST(
      postRequest({
        name: "Paket Admin",
        vehicleType: "motor",
        price: 35000,
        durationMin: 30,
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.name).toBe("Paket Admin");
    expect(body.data.price).toBe(35000);
  });

  it("menolak body dengan harga 0 sebagai VALIDATION_ERROR", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await POST(
      postRequest({
        name: "Paket Gratis",
        vehicleType: "motor",
        price: 0,
        durationMin: 15,
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("memfilter daftar berdasarkan tipe kendaraan", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    const response = await GET(
      new Request("http://localhost/api/packages?vehicleType=mobil"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.every((row: { vehicleType: string }) => row.vehicleType === "mobil")).toBe(
      true,
    );
  });

  it("menolak query tipe kendaraan yang tidak dikenal", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    const response = await GET(
      new Request("http://localhost/api/packages?vehicleType=truk"),
    );
    expect(response.status).toBe(400);
  });
});
