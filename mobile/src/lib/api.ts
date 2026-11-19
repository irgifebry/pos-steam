import { clearAuthStorage, getBaseUrl, getSession, setActiveUser, setSession } from './storage';
import type { Addon, Attendance, AttendanceSave, Bank, CashShift, Order, OrderCancel, OrderCreate, OrderPaymentInput, OrderStatus, Outlet, Payroll, Reports, ServicePackage, Session, User } from '../types';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ApiError'; }
}
type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; auth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers: supplied, body, ...init } = options;
  const baseUrl = await getBaseUrl();
  const headers = new Headers(supplied);
  headers.set('Accept', 'application/json');
  // Better Auth validates Origin header; React Native doesn't send one automatically
  if (!headers.has('Origin')) headers.set('Origin', baseUrl);
  const session = auth ? await getSession() : null;
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (session?.cookie) headers.set('Cookie', session.cookie);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body) });
  const text = response.status === 204 ? '' : await response.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!response.ok) {
    let errorCode = 'HTTP_ERROR';
    let errorMessage = 'Terjadi kesalahan pada server';
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.message === 'string') errorMessage = obj.message;
      if (typeof obj.code === 'string') errorCode = obj.code;
      if (obj.error && typeof obj.error === 'object') {
        const errObj = obj.error as Record<string, unknown>;
        if (typeof errObj.message === 'string') errorMessage = errObj.message;
        if (typeof errObj.code === 'string') errorCode = errObj.code;
      } else if (typeof obj.error === 'string') {
        errorMessage = obj.error;
      }
    } else if (typeof data === 'string' && data) {
      errorMessage = data;
    }
    throw new ApiError(response.status, errorCode, errorMessage);
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
      const result = await request<Session & { token?: string; session?: { token?: string; cookie?: string; expiresAt?: string } }>('/api/auth/sign-in/email', { ...json('POST', { email, password }), auth: false });
      const normalized: Session = {
        ...result,
        token: result.token ?? result.session?.token,
        cookie: result.cookie ?? result.session?.cookie,
        expiresAt: result.expiresAt ?? result.session?.expiresAt,
      };
      await setSession(normalized);
      await setActiveUser(normalized.user);
      return normalized;
    },
    getSession: () => request<Session & { session?: { token?: string; cookie?: string } } | null>('/api/auth/get-session'),
    session: () => request<Session & { session?: { token?: string; cookie?: string } } | null>('/api/auth/get-session'),
    logout: async () => { try { await request<void>('/api/auth/sign-out', json('POST', {})); } finally { await clearAuthStorage(); } },
  },
  packages: {
    list: async (params: { vehicleType?: string; active?: boolean } = {}) => {
      const result = await request<ServicePackage[] | { packages?: ServicePackage[]; items?: ServicePackage[] }>(`/api/packages${query({ vehicleType: params.vehicleType, includeInactive: params.active === false ? true : undefined })}`);
      return Array.isArray(result) ? result : result.packages ?? result.items ?? [];
    },
    create: (body: Partial<ServicePackage>) => request<ServicePackage>('/api/packages', json('POST', body)),
    update: (id: string, body: Partial<ServicePackage>) => request<ServicePackage>(`/api/packages/${encodeURIComponent(id)}`, json('PATCH', body)),
    delete: (id: string) => request<void>(`/api/packages/${encodeURIComponent(id)}`, json('DELETE')),
  },
  addons: {
    list: async (params: { vehicleType?: string; includeInactive?: boolean } = {}) => {
      const result = await request<Addon[] | { addons?: Addon[]; items?: Addon[] }>(`/api/addons${query(params)}`);
      return Array.isArray(result) ? result : result.addons ?? result.items ?? [];
    },
    create: (body: Partial<Addon>) => request<Addon>('/api/addons', json('POST', body)),
    update: (id: string, body: Partial<Addon>) => request<Addon>(`/api/addons/${encodeURIComponent(id)}`, json('PATCH', body)),
    delete: (id: string) => request<void>(`/api/addons/${encodeURIComponent(id)}`, json('DELETE')),
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
  outlets: {
    update: async (body: Partial<Outlet>) => {
      const result = await request<Outlet | { outlet?: Outlet }>('/api/outlets', json('PATCH', body));
      return 'outlet' in result && result.outlet ? result.outlet : result as Outlet;
    },
  },
  banks: {
    list: async (includeInactive = false) => {
      const result = await request<Bank[] | { banks?: Bank[]; items?: Bank[] }>(`/api/banks${query({ includeInactive: includeInactive || undefined })}`);
      return Array.isArray(result) ? result : result.banks ?? result.items ?? [];
    },
    create: (body: Partial<Bank>) => request<Bank>('/api/banks', json('POST', body)),
    update: (id: string, body: Partial<Bank>) => request<Bank>(`/api/banks/${encodeURIComponent(id)}`, json('PATCH', body)),
    delete: (id: string) => request<void>(`/api/banks/${encodeURIComponent(id)}`, json('DELETE')),
  },
  users: {
    list: () => request<User[]>('/api/users'),
    create: (body: { name: string; email: string; role: string; phone: string; dailyRate: number; password: string; active: boolean }) =>
      request<User>('/api/users', json('POST', body)),
    update: (id: string, body: { name?: string; email?: string; role?: string; phone?: string; dailyRate?: number }) =>
      request<User>(`/api/users/${encodeURIComponent(id)}`, json('PATCH', body)),
    setActive: (id: string, active: boolean) =>
      request<User>(`/api/users/${encodeURIComponent(id)}/active`, json('POST', { active })),
    resetPin: (id: string, password: string) =>
      request<void>(`/api/users/${encodeURIComponent(id)}/pin`, json('POST', { password })),
  },
};