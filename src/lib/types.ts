import type { z } from "zod";
import type {
  addonInputSchema,
  addonUpdateSchema,
  attendanceRecordSchema,
  attendanceSaveSchema,
  attendanceStatusSchema,
  bankInputSchema,
  bankUpdateSchema,
  cashShiftCloseSchema,
  cashShiftOpenSchema,
  orderCancelSchema,
  orderCreateSchema,
  orderPaymentInputSchema,
  orderStatusSchema,
  outletInputSchema,
  outletUpdateSchema,
  payrollAdjustmentSchema,
  payrollSaveSchema,
  reportRangeSchema,
  roleSchema,
  servicePackageInputSchema,
  servicePackageUpdateSchema,
  settingsUpdateSchema,
  userCreateSchema,
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
export type UserCreate = z.infer<typeof userCreateSchema>;
export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderStatusUpdate = z.infer<typeof orderStatusSchema>;
export type OrderCancel = z.infer<typeof orderCancelSchema>;
export type OrderPaymentInput = z.infer<typeof orderPaymentInputSchema>;
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type AttendanceSave = z.infer<typeof attendanceSaveSchema>;
export type PayrollAdjustment = z.infer<typeof payrollAdjustmentSchema>;
export type PayrollSave = z.infer<typeof payrollSaveSchema>;
export type CashShiftOpen = z.infer<typeof cashShiftOpenSchema>;
export type CashShiftClose = z.infer<typeof cashShiftCloseSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type ReportRange = z.infer<typeof reportRangeSchema>;
