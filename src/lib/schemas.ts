import { z } from "zod";

export const vehicleTypeSchema = z.enum(["motor", "mobil"]);
export const roleSchema = z.enum(["admin", "kasir", "operator"]);
export const attendanceStatusSchema = z.enum(["hadir", "izin", "sakit", "alpha", "cuti"]);

export const servicePackageInputSchema = z.object({
  name: z.string().trim().min(1, "Nama paket wajib diisi").max(60),
  vehicleType: vehicleTypeSchema,
  price: z.number().int().positive("Harga harus lebih dari 0").max(100_000_000),
  durationMin: z.number().int().positive("Estimasi durasi harus lebih dari 0").max(600),
  description: z.string().trim().max(200).default(""),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const addonInputSchema = z.object({
  name: z.string().trim().min(1, "Nama add-on wajib diisi").max(60),
  price: z.number().int().positive("Harga harus lebih dari 0").max(100_000_000),
  unitLabel: z.string().trim().min(1).max(20).default("pcs"),
  vehicleTypes: z
    .array(vehicleTypeSchema)
    .min(1, "Pilih minimal satu tipe kendaraan")
    .default(["motor", "mobil"]),
  active: z.boolean().default(true),
});

export const outletInputSchema = z.object({
  name: z.string().trim().min(1, "Nama outlet wajib diisi").max(100),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(30).default(""),
  receiptFooter: z.string().trim().max(200).default(""),
  taxPercent: z.number().min(0).max(100).default(0),
});

export const bankInputSchema = z.object({
  name: z.string().trim().min(1, "Nama bank wajib diisi").max(60),
  accountNumber: z.string().trim().min(1, "Nomor rekening wajib diisi").max(40),
  accountName: z.string().trim().min(1, "Nama pemilik rekening wajib diisi").max(80),
  active: z.boolean().default(true),
});

export const userInputSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(80),
  email: z.string().email("Format email tidak valid").max(160),
  role: roleSchema.default("kasir"),
  phone: z.string().trim().max(30).default(""),
  dailyRate: z.number().int().nonnegative("Gaji harian tidak boleh negatif").default(0),
  active: z.boolean().default(true),
});

export const servicePackageUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama paket wajib diisi").max(60).optional(),
  vehicleType: vehicleTypeSchema.optional(),
  price: z.number().int().positive("Harga harus lebih dari 0").max(100_000_000).optional(),
  durationMin: z.number().int().positive("Estimasi durasi harus lebih dari 0").max(600).optional(),
  description: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const addonUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama add-on wajib diisi").max(60).optional(),
  price: z.number().int().positive("Harga harus lebih dari 0").max(100_000_000).optional(),
  unitLabel: z.string().trim().min(1).max(20).optional(),
  vehicleTypes: z.array(vehicleTypeSchema).min(1, "Pilih minimal satu tipe kendaraan").optional(),
  active: z.boolean().optional(),
});

export const outletUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama outlet wajib diisi").max(100).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(30).optional(),
  receiptFooter: z.string().trim().max(200).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});

export const bankUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama bank wajib diisi").max(60).optional(),
  accountNumber: z.string().trim().min(1, "Nomor rekening wajib diisi").max(40).optional(),
  accountName: z.string().trim().min(1, "Nama pemilik rekening wajib diisi").max(80).optional(),
  active: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(80).optional(),
  email: z.string().email("Format email tidak valid").max(160).optional(),
  role: roleSchema.optional(),
  phone: z.string().trim().max(30).optional(),
  dailyRate: z.number().int().nonnegative("Gaji harian tidak boleh negatif").optional(),
  active: z.boolean().optional(),
});

export const pinSchema = z.string().min(6, "PIN minimal 6 karakter").max(72);
