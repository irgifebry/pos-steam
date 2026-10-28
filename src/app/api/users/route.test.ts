import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import { setDatabase } from "@/lib/db/provider";
import { outlets } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";
import { createAuth } from "@/lib/auth/config";
import { setAuth } from "@/lib/auth/provider";
import { createUser } from "@/lib/services/users";
import { GET, POST } from "./route";

const state = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
}));

describe("/api/users", () => {
  let db: AppDatabase;
  let auth: ReturnType<typeof createAuth>;
  let adminCookie: string;
  let kasirCookie: string;

  async function login(email: string, password: string): Promise<string> {
    const result = await auth.api.signInEmail({
      body: { email, password },
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
    auth = createAuth(db, { nextCookies: false });
    setDatabase(db);
    setAuth(auth);

    const [outlet] = await db
      .insert(outlets)
      .values({ name: "Outlet Uji" })
      .returning({ id: outlets.id });

    await createUser(db, auth, {
      name: "Admin Uji",
      email: "admin-users@contoh.id",
      password: "123456",
      role: "admin",
      phone: "",
      dailyRate: 0,
      active: true,
      outletId: outlet.id,
    });
    await createUser(db, auth, {
      name: "Kasir Uji",
      email: "kasir-users@contoh.id",
      password: "123456",
      role: "kasir",
      phone: "",
      dailyRate: 50000,
      active: true,
      outletId: outlet.id,
    });

    adminCookie = await login("admin-users@contoh.id", "123456");
    kasirCookie = await login("kasir-users@contoh.id", "123456");
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("menolak daftar lengkap untuk role kasir", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    const response = await GET(new Request("http://localhost/api/users"));
    expect(response.status).toBe(403);
  });

  it("mengizinkan kasir melihat daftar ringan tanpa email dan gaji", async () => {
    state.headers = new Headers({ cookie: kasirCookie });
    const response = await GET(new Request("http://localhost/api/users?light=1"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(Object.keys(body.data[0]).sort()).toEqual(["id", "name", "role"]);
    expect(JSON.stringify(body)).not.toContain("dailyRate");
    expect(JSON.stringify(body)).not.toContain("@");
  });

  it("mengembalikan daftar lengkap untuk admin", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await GET(new Request("http://localhost/api/users"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.some((row: { dailyRate: number }) => row.dailyRate === 50000)).toBe(true);
  });

  it("membuat pengguna baru lewat admin", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await POST(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Karyawan Baru",
          email: "karyawan-baru@contoh.id",
          password: "654321",
          role: "kasir",
          dailyRate: 45000,
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.email).toBe("karyawan-baru@contoh.id");
    expect(body.data.dailyRate).toBe(45000);
  });

  it("menolak PIN yang kurang dari 6 karakter", async () => {
    state.headers = new Headers({ cookie: adminCookie });
    const response = await POST(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "PIN Pendek",
          email: "pin-pendek@contoh.id",
          password: "12345",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
