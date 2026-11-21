import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { outlets, user as userTable } from "./schema";
import type { AppDatabase } from "./schema";
import type { Auth } from "@/lib/auth/config";

const OUTLET_ID = "00000000-4000-8000-000000000001";

// Satu-satunya akun demo. Kredensial ini wajib diganti di luar lokal.
const ADMIN_EMAIL = "admin@pos.test";
const ADMIN_PIN = "123456";

// Nama outlet bisa diisi lewat env; hanya placeholder netral, bukan data contoh.
const OUTLET_NAME = process.env.SEED_OUTLET_NAME?.trim() || "KYANE POS";

export async function seed(db: AppDatabase, auth: Auth): Promise<void> {
  // Outlet kosong: admin mengisi nama/alamat/telepon dan master data lewat UI.
  await db
    .insert(outlets)
    .values({
      id: OUTLET_ID,
      name: OUTLET_NAME,
      address: "",
      phone: "",
      receiptFooter: "",
      taxPercent: "0",
    })
    .onConflictDoUpdate({
      target: outlets.id,
      set: {
        name: OUTLET_NAME,
        address: "",
        phone: "",
        receiptFooter: "",
        taxPercent: "0",
        updatedAt: new Date(),
      },
    });

  const [existingAdmin] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, ADMIN_EMAIL))
    .limit(1);

  if (!existingAdmin) {
    const result = await auth.api.signUpEmail({
      body: { name: "Admin", email: ADMIN_EMAIL, password: ADMIN_PIN },
      returnHeaders: true,
    });

    const created = result.response?.user;
    if (!created) {
      throw new Error("Gagal membuat akun admin seed");
    }

    await db
      .update(userTable)
      .set({ role: "admin", outletId: OUTLET_ID, active: true, dailyRate: 0 })
      .where(eq(userTable.id, created.id));
  } else {
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(ADMIN_PIN);
    const accounts = await ctx.internalAdapter.findAccountByUserId(existingAdmin.id);
    const account = accounts[0];
    if (account) {
      await ctx.internalAdapter.updateAccount(account.id, { password: hash });
    }
    await ctx.internalAdapter.deleteUserSessions(existingAdmin.id);

    await db
      .update(userTable)
      .set({ role: "admin", outletId: OUTLET_ID, active: true, dailyRate: 0 })
      .where(eq(userTable.id, existingAdmin.id));
  }
}

async function runFromCli(): Promise<void> {
  const { createDatabase } = await import("./client");
  const { createAuth } = await import("@/lib/auth/config");
  const { getEnv } = await import("@/lib/env");

  const env = getEnv();
  const db = createDatabase(env.DATABASE_URL);
  const auth = createAuth(db, { nextCookies: false });
  await seed(db, auth);
  console.log("Seed selesai: outlet kosong dan satu akun demo siap.");
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runFromCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
