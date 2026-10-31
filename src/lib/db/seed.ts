import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { addons, banks, outlets, servicePackages, user as userTable } from "./schema";
import type { AppDatabase } from "./schema";
import type { Auth } from "@/lib/auth/config";

const OUTLET_ID = "00000000-4000-8000-000000000001";
const BANK_IDS = {
  bca: "00000000-4000-8000-000000000101",
  bri: "00000000-4000-8000-000000000102",
  mandiri: "00000000-4000-8000-000000000103",
};

const ADMIN_EMAIL = "admin@pos.test";
// PIN demo numerik (min. 6 digit); wajib diganti lewat Pengaturan setelah login pertama.
const ADMIN_PIN = "123456";

export async function seed(db: AppDatabase, auth: Auth): Promise<void> {
  await db
    .insert(outlets)
    .values({
      id: OUTLET_ID,
      name: "Cuci Steam Bersama",
      address: "Jl. Contoh No. 12, Jakarta",
      phone: "0812-0000-0000",
      receiptFooter: "Terima kasih atas kunjungan Anda",
      taxPercent: "0",
    })
    .onConflictDoUpdate({
      target: outlets.id,
      set: {
        name: "Cuci Steam Bersama",
        address: "Jl. Contoh No. 12, Jakarta",
        phone: "0812-0000-0000",
        receiptFooter: "Terima kasih atas kunjungan Anda",
        taxPercent: "0",
        updatedAt: new Date(),
      },
    });

  // TODO: harga masih placeholder 1000; ganti lewat menu Pengaturan.
  const packages = [
    { name: "Cuci Steam Reguler", vehicleType: "motor", durationMin: 15, sortOrder: 1 },
    { name: "Cuci Steam Komplit", vehicleType: "motor", durationMin: 30, sortOrder: 2 },
    { name: "Cuci Steam Premium", vehicleType: "motor", durationMin: 45, sortOrder: 3 },
    { name: "Cuci Steam Reguler", vehicleType: "mobil", durationMin: 20, sortOrder: 1 },
    { name: "Cuci Steam Komplit", vehicleType: "mobil", durationMin: 40, sortOrder: 2 },
    { name: "Cuci Steam Premium", vehicleType: "mobil", durationMin: 60, sortOrder: 3 },
  ];

  for (const paket of packages) {
    await db
      .insert(servicePackages)
      .values({
        outletId: OUTLET_ID,
        name: paket.name,
        vehicleType: paket.vehicleType,
        price: 1000,
        durationMin: paket.durationMin,
        description: "",
        sortOrder: paket.sortOrder,
        active: true,
      })
      .onConflictDoUpdate({
        target: [
          servicePackages.outletId,
          servicePackages.vehicleType,
          servicePackages.name,
        ],
        set: {
          durationMin: paket.durationMin,
          sortOrder: paket.sortOrder,
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  const addonRows = [
    { name: "Semprot Wax", unitLabel: "pcs", vehicleTypes: ["motor", "mobil"] as const },
    { name: "Ojek Ban", unitLabel: "ban", vehicleTypes: ["motor"] as const },
    { name: "Semprot Interior", unitLabel: "pcs", vehicleTypes: ["mobil"] as const },
    { name: "Poles Kaca", unitLabel: "pcs", vehicleTypes: ["motor", "mobil"] as const },
  ];

  for (const addon of addonRows) {
    await db
      .insert(addons)
      .values({
        outletId: OUTLET_ID,
        name: addon.name,
        price: 1000,
        unitLabel: addon.unitLabel,
        vehicleTypes: [...addon.vehicleTypes],
        active: true,
      })
      .onConflictDoUpdate({
        target: [addons.outletId, addons.name],
        set: {
          unitLabel: addon.unitLabel,
          vehicleTypes: [...addon.vehicleTypes],
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  const bankRows = [
    {
      id: BANK_IDS.bca,
      name: "BCA",
      accountNumber: "0000000000",
      accountName: "Cuci Steam Bersama",
    },
    {
      id: BANK_IDS.bri,
      name: "BRI",
      accountNumber: "0000000000",
      accountName: "Cuci Steam Bersama",
    },
    {
      id: BANK_IDS.mandiri,
      name: "Mandiri",
      accountNumber: "0000000000",
      accountName: "Cuci Steam Bersama",
    },
  ];

  for (const bank of bankRows) {
    await db
      .insert(banks)
      .values({ ...bank, outletId: OUTLET_ID, active: true })
      .onConflictDoUpdate({
        target: banks.id,
        set: {
          name: bank.name,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  const [existingAdmin] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, ADMIN_EMAIL))
    .limit(1);

  if (!existingAdmin) {
    const result = await auth.api.signUpEmail({
      body: { name: "Admin Outlet", email: ADMIN_EMAIL, password: ADMIN_PIN },
      returnHeaders: true,
    });

    const created = result.response?.user;
    if (!created) {
      throw new Error("Gagal membuat akun admin seed");
    }

    await db
      .update(userTable)
      .set({ role: "admin", outletId: OUTLET_ID, active: true })
      .where(eq(userTable.id, created.id));
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
  console.log("Seed selesai: outlet, paket, add-on, bank, dan admin siap.");
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runFromCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
