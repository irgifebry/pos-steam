import type { z } from "zod";
import type {
  addonInputSchema,
  addonUpdateSchema,
  attendanceStatusSchema,
  bankInputSchema,
  bankUpdateSchema,
  outletInputSchema,
  outletUpdateSchema,
  roleSchema,
  servicePackageInputSchema,
  servicePackageUpdateSchema,
  userInputSchema,
  userUpdateSchema,
  vehicleTypeSchema,
} from "./schemas";

export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type Role = z.infer<typeof roleSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type ServicePackageInput = z.infer<typeof servicePackageInputSchema>;
export type ServicePackageUpdate = z.infer<typeof servicePackageUpdateSchema>;
export type AddonInput = z.infer<typeof addonInputSchema>;
export type AddonUpdate = z.infer<typeof addonUpdateSchema>;
export type OutletInput = z.infer<typeof outletInputSchema>;
export type OutletUpdate = z.infer<typeof outletUpdateSchema>;
export type BankInput = z.infer<typeof bankInputSchema>;
export type BankUpdate = z.infer<typeof bankUpdateSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
