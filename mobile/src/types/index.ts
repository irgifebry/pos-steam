export type VehicleType = 'motor' | 'mobil';
export type Role = 'admin' | 'karyawan';
export type OrderStatus = 'menunggu' | 'proses' | 'selesai' | 'paid' | 'dibatalkan';
export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpha' | 'cuti';

export interface User {
  id: string; name: string; email: string; role: Role; phone: string;
  dailyRate: number; active: boolean; outletId?: string; createdAt?: string;
}
export interface Session { user: User; token?: string; cookie?: string; expiresAt?: string }
export interface Outlet { id: string; name: string; address: string; phone: string; receiptFooter: string; taxPercent: number; defaultDailyRate: number; active?: boolean }
export interface Bank { id: string; name: string; accountNumber: string; accountName: string; active: boolean }
export interface ServicePackage { id: string; name: string; vehicleType: VehicleType; price: number; royaltyPrice: number | null; description: string; sortOrder: number; active: boolean }
export interface Addon { id: string; name: string; price: number; unitLabel: string; vehicleTypes: VehicleType[]; active: boolean }
export interface OrderItem { id: string; kind: string; refId: string | null; name: string; price: number; qty: number; subtotal: number }
export interface OrderPayment { id: string; method: string; amount: number; tender: number | null; changeAmount: number | null; bank: string | null; referenceNo: string | null; verifiedAt: string | null }
export interface Order {
  id: string; invoiceNo: string; businessDate: string; queueNo: string; queueSeq: number; queuePrefix: string;
  vehicleType: VehicleType; status: OrderStatus; customerName: string; customerPhone: string; plate: string;
  total: number; tax: number; grandTotal: number; discount: number; createdAt: string; startedAt: string | null;
  finishedAt: string | null; cancelledReason: string | null; packageName: string; packagePrice: number; estimatedMin: number;
  addons: OrderItem[]; payment: OrderPayment | null; paid: boolean; createdBy: string; createdByName: string;
}
export interface OrderCancel { reason: string }
export interface Attendance { userId: string; status: AttendanceStatus; checkIn: string | null; checkOut: string | null; note: string }
export interface AttendanceRecord extends Attendance { name?: string; role?: Role; dailyRate?: number }
export interface Payroll { period: string; finalized?: boolean; employees: Array<{ userId: string; name: string; dailyRate: number; hadir: number; izin: number; sakit: number; alpha: number; cuti: number; tunjangan: number; lembur: number; potongan: number; total: number }> }
export interface CashShift { id: string; openedAt: string; closedAt: string | null; openingCash: number; closingCash: number | null; expectedCash?: number; difference?: number; note: string }
export interface Reports { from: string; to: string; totalOrders?: number; omzet?: number; transactions?: Order[]; [key: string]: unknown }

export interface OrderPaymentInput { method: 'tunai' | 'transfer'; cashReceived?: number; bankId?: string; referenceNo?: string }
export interface OrderCreate { clientId?: string; vehicleType: VehicleType; packageId: string; addons?: Array<{ addonId: string; qty: number }>; customerName?: string; customerPhone?: string; vehicleName?: string; plate?: string; discount?: number; royalty?: boolean; payment?: OrderPaymentInput }
export interface AttendanceSave { date: string; records: Record<string, { status: AttendanceStatus; checkIn?: string; checkOut?: string; note?: string }> }
export interface ApiErrorPayload { code: string; message: string }
