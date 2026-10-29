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
  defaultDailyRate: z.number().int().nonnegative().default(0),
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
  defaultDailyRate: z.number().int().nonnegative().optional(),
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

export const userCreateSchema = userInputSchema.extend({
  password: pinSchema,
});

export const userActiveSchema = z.object({
  active: z.boolean(),
});

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format periode tidak valid");

const clockSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Format jam tidak valid");

export const orderAddonSchema = z.object({
  addonId: z.string().min(1, "Add-on tidak valid"),
  qty: z.number().int().positive("Jumlah add-on minimal 1").max(99),
});

export const orderPaymentInputSchema = z.object({
  method: z.enum(["tunai", "transfer"]),
  cashReceived: z.number().int().nonnegative().optional(),
  bankId: z.string().min(1).optional(),
  referenceNo: z.string().trim().max(100).optional(),
});

export const orderCreateSchema = z.object({
  clientId: z.string().uuid().optional(),
  vehicleType: vehicleTypeSchema,
  packageId: z.string().min(1, "Paket wajib dipilih"),
  addons: z.array(orderAddonSchema).default([]),
  customerName: z.string().trim().max(80).default(""),
  customerPhone: z.string().trim().max(30).default(""),
  plate: z.string().trim().max(20).default(""),
  payment: orderPaymentInputSchema.optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["proses", "selesai"]),
});

export const orderCancelSchema = z.object({
  reason: z.string().trim().min(3, "Alasan pembatalan wajib diisi").max(300),
});

export const attendanceRecordSchema = z.object({
  status: attendanceStatusSchema,
  checkIn: clockSchema.optional(),
  checkOut: clockSchema.optional(),
  note: z.string().trim().max(200).optional(),
});

export const attendanceSaveSchema = z.object({
  date: isoDateSchema,
  records: z.record(z.string(), attendanceRecordSchema),
});

export const attendanceSummaryQuerySchema = z.object({
  period: periodSchema,
});

export const payrollAdjustmentSchema = z.object({
  tunjangan: z.number().int().nonnegative().default(0),
  lembur: z.number().int().nonnegative().default(0),
  potongan: z.number().int().nonnegative().default(0),
});

export const payrollSaveSchema = z.object({
  period: periodSchema,
  adjustments: z.record(z.string(), payrollAdjustmentSchema).default({}),
  finalize: z.boolean().default(false),
});

export const cashShiftOpenSchema = z.object({
  openingCash: z.number().int().nonnegative("Saldo awal tidak boleh negatif"),
  note: z.string().trim().max(200).default(""),
});

export const cashShiftCloseSchema = z.object({
  closingCash: z.number().int().nonnegative("Kas akhir tidak boleh negatif"),
});

export const settingsUpdateSchema = z.object({
  defaultDailyRate: z.number().int().nonnegative("Gaji harian tidak boleh negatif"),
});

export const reportRangeSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});
