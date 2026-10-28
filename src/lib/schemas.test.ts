import { describe, expect, it } from "vitest";
import {
  addonInputSchema,
  bankInputSchema,
  outletInputSchema,
  servicePackageInputSchema,
  userInputSchema,
  vehicleTypeSchema,
} from "./schemas";

describe("servicePackageInputSchema", () => {
  it("menolak harga 0", () => {
    const result = servicePackageInputSchema.safeParse({
      name: "Komplit",
      vehicleType: "motor",
      price: 0,
      durationMin: 20,
    });
    expect(result.success).toBe(false);
  });

  it("menolak harga negatif", () => {
    const result = servicePackageInputSchema.safeParse({
      name: "Komplit",
      vehicleType: "motor",
      price: -1,
      durationMin: 20,
    });
    expect(result.success).toBe(false);
  });

  it("memotong spasi di nama", () => {
    const result = servicePackageInputSchema.parse({
      name: "  Komplit  ",
      vehicleType: "motor",
      price: 35000,
      durationMin: 20,
    });
    expect(result.name).toBe("Komplit");
  });

  it("memberi default description, sortOrder, active", () => {
    const result = servicePackageInputSchema.parse({
      name: "Komplit",
      vehicleType: "motor",
      price: 35000,
      durationMin: 20,
    });
    expect(result.description).toBe("");
    expect(result.sortOrder).toBe(0);
    expect(result.active).toBe(true);
  });

  it("menolak tipe kendaraan di luar motor/mobil", () => {
    const result = vehicleTypeSchema.safeParse("truk");
    expect(result.success).toBe(false);
  });
});

describe("addonInputSchema", () => {
  it("menolak vehicleTypes kosong", () => {
    const result = addonInputSchema.safeParse({
      name: "Wax",
      price: 10000,
      vehicleTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it("memberi default unitLabel pcs dan semua tipe kendaraan", () => {
    const result = addonInputSchema.parse({ name: "Wax", price: 10000 });
    expect(result.unitLabel).toBe("pcs");
    expect(result.vehicleTypes).toEqual(["motor", "mobil"]);
    expect(result.active).toBe(true);
  });
});

describe("userInputSchema", () => {
  it("menolak email tidak valid", () => {
    const result = userInputSchema.safeParse({
      name: "Siti",
      email: "bukan-email",
    });
    expect(result.success).toBe(false);
  });

  it("default role adalah kasir", () => {
    const result = userInputSchema.parse({ name: "Siti", email: "siti@contoh.id" });
    expect(result.role).toBe("kasir");
    expect(result.dailyRate).toBe(0);
    expect(result.active).toBe(true);
  });

  it("menolak role di luar admin/kasir/operator", () => {
    const result = userInputSchema.safeParse({
      name: "Siti",
      email: "siti@contoh.id",
      role: "owner",
    });
    expect(result.success).toBe(false);
  });
});

describe("outletInputSchema", () => {
  it("default pajak 0 dan field teks kosong", () => {
    const result = outletInputSchema.parse({ name: "Cuci Steam Bersama" });
    expect(result.taxPercent).toBe(0);
    expect(result.address).toBe("");
    expect(result.phone).toBe("");
    expect(result.receiptFooter).toBe("");
  });

  it("menolak pajak di atas 100", () => {
    const result = outletInputSchema.safeParse({ name: "Outlet", taxPercent: 101 });
    expect(result.success).toBe(false);
  });
});

describe("bankInputSchema", () => {
  it("mewajibkan nomor rekening dan nama pemilik", () => {
    const result = bankInputSchema.safeParse({ name: "BCA" });
    expect(result.success).toBe(false);
  });
});
