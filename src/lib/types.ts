import type { z } from "zod";
import type {
  addonInputSchema,
  attendanceStatusSchema,
  bankInputSchema,
  outletInputSchema,
  roleSchema,
  servicePackageInputSchema,
  userInputSchema,
  vehicleTypeSchema,
} from "./schemas";

export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type Role = z.infer<typeof roleSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type ServicePackageInput = z.infer<typeof servicePackageInputSchema>;
export type AddonInput = z.infer<typeof addonInputSchema>;
export type OutletInput = z.infer<typeof outletInputSchema>;
export type BankInput = z.infer<typeof bankInputSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
