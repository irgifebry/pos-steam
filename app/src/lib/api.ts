import { clearAuthStorage, getBaseUrl, getSession, setActiveUser, setSession } from './storage';
import type { Addon, Attendance, AttendanceSave, Bank, CashShift, Order, OrderCancel, OrderCreate, OrderPaymentInput, OrderStatus, Payroll, Reports, ServicePackage, Session, User } from '../types';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ApiError'; }
}
type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; auth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers: supplied, body, ...init } = options;
  const headers = new Headers(supplied);
  headers.set('Accept', 'application/json');
  const session = auth ? await getSession() : null;
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (session?.cookie) headers.set('Cookie', session.cookie);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${await getBaseUrl()}${path}`, { ...init, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body) });
  const text = response.status === 204 ? '' : await response.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!response.ok) {
    const error = data && typeof data === 'object' ? (data as { error?: { code?: string; message?: string } }).error : undefined;
    throw new ApiError(response.status, error?.code || 'HTTP_ERROR', error?.message || (typeof data === 'string' ? data : 'Terjadi kesalahan pada server'));
  }
  if (data && typeof data === 'object' && 'data' in data) return (data as { data: T }).data;
  return data as T;
}
const query = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined) search.set(key, String(value)); });
  const result = search.toString(); return result ? `?${result}` : '';
};
const json = (method: string, body?: unknown): RequestOptions => ({ method, body });

export const api = {
  request,
  auth: {
    login: async (email: string, password: string): Promise<Session> => {
      const result = await request<Session>('/api/auth/sign-in/email', { ...json('POST', { email, password }), auth: false });
      const cookieHeader = (result as Session & { token?: string }).token;
      if (cookieHeader) await setSession({ ...result, token: cookieHeader });
      else await setSession(result);
      await setActiveUser(result.user); return result;
    },
    session: () => request<Session>('/api/auth/get-session'),
    logout: async () => { try { await request<void>('/api/auth/sign-out', json('POST')); } finally { await clearAuthStorage(); } },
  },
  packages: {
    list: (params: { vehicleType?: string; active?: boolean } = {}) => request<ServicePackage[]>(`/api/packages${query({ vehicleType: params.vehicleType, includeInactive: params.active === false ? true : undefined })}`),
    create: (body: Partial<ServicePackage>) => request<ServicePackage>('/api/packages', json('POST', body)),
    update: (id: string, body: Partial<ServicePackage>) => request<ServicePackage>(`/api/packages/${encodeURIComponent(id)}`, json('PATCH', body)),
  },
  addons: {
    list: (params: { vehicleType?: string; includeInactive?: boolean } = {}) => request<Addon[]>(`/api/addons${query(params)}`),
    create: (body: Partial<Addon>) => request<Addon>('/api/addons', json('POST', body)),
    update: (id: string, body: Partial<Addon>) => request<Addon>(`/api/addons/${encodeURIComponent(id)}`, json('PATCH', body)),
  },
  orders: {
    list: (params: { date?: string; from?: string; to?: string; includePaid?: boolean } = {}) => request<Order[]>(`/api/orders${query(params)}`),
    create: (body: OrderCreate) => request<Order>('/api/orders', json('POST', body)),
    update: (id: string, body: Partial<OrderCreate>) => request<Order>(`/api/orders/${encodeURIComponent(id)}`, json('PATCH', body)),
    setStatus: (id: string, status: Extract<OrderStatus, 'proses' | 'selesai'>) => request<Order>(`/api/orders/${encodeURIComponent(id)}/status`, json('PATCH', { status })),
    cancel: (id: string, body: OrderCancel) => request<Order>(`/api/orders/${encodeURIComponent(id)}/cancel`, json('POST', body)),
    pay: (id: string, body: OrderPaymentInput) => request<Order>(`/api/orders/${encodeURIComponent(id)}/payments`, json('POST', body)),
  },
  board: () => request<{ orders: Order[]; summary: { menunggu: number; proses: number; selesai: number; total: number; cancelled: number } }>('/api/board'),
  attendance: {
    list: (date: string) => request<Attendance[]>(`/api/attendance${query({ date })}`),
    save: (body: AttendanceSave) => request<Attendance[]>('/api/attendance', json('POST', body)),
    summary: (period: string) => request<Array<{ userId: string; name: string; role: string; dailyRate: number; hadir: number; izin: number; sakit: number; alpha: number; cuti: number; totalHours: number }>>(`/api/attendance/summary${query({ period })}`),
  },
  reports: {
    omzet: (from: string, to: string) => request<Reports>(`/api/reports/omzet${query({ from, to })}`),
    transactions: (from: string, to: string) => request<Reports>(`/api/reports/transactions${query({ from, to })}`),
    cash: (date: string) => request<Reports>(`/api/reports/cash${query({ date })}`),
    today: () => request<Reports>('/api/dashboard/today'),
  },
  payroll: {
    get: (period: string) => request<Payroll>(`/api/payroll${query({ period })}`),
    save: (body: unknown) => request<Payroll>('/api/payroll', json('POST', body)),
  },
  cashShifts: {
    current: () => request<CashShift>('/api/cash-shifts'),
    open: (body: { openingCash: number; note?: string }) => request<CashShift>('/api/cash-shifts', json('POST', body)),
    close: (id: string, closingCash: number) => request<CashShift>(`/api/cash-shifts/${encodeURIComponent(id)}/close`, json('POST', { closingCash })),
  },
  settings: {
    get: () => request<Record<string, unknown>>('/api/settings'),
    update: (body: Record<string, unknown>) => request<Record<string, unknown>>('/api/settings', json('PATCH', body)),
  },
  banks: () => request<Bank[]>('/api/banks'),
  users: () => request<User[]>('/api/users'),
};

