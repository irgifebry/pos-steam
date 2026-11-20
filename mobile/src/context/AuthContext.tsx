import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { clearAuthStorage, getSession, setActiveUser, setSession } from '../lib/storage';
import type { Outlet, Session, User } from '../types';

type AuthResponse = Session & { token?: string; session?: { token?: string; cookie?: string; expiresAt?: string }; user: User; outlet?: Outlet | null; activeOutlet?: Outlet | null };
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  activeOutlet: Outlet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passwordOrPin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateActiveOutlet: (outlet: Outlet) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

// Respons sign-in/get-session tidak membawa data outlet. Ambil dari endpoint
// /api/outlets supaya header dan perhitungan pajak Kasir tidak memakai default.
async function resolveOutlet(result: AuthResponse): Promise<Outlet | null> {
  const fromResponse = result.activeOutlet ?? result.outlet;
  if (fromResponse) return fromResponse;
  try {
    const outlets = await api.outlets.list();
    if (!outlets.length) return null;
    return outlets.find((outlet) => outlet.id === result.user?.outletId) ?? outlets[0];
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [activeOutlet, setActiveOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const stored = await getSession();
        if (!stored) return;
        const result = await api.auth.getSession() as AuthResponse | null;
        if (!result?.user) {
          await clearAuthStorage();
          return;
        }
        const restored: Session = {
          ...result,
          token: result.token ?? result.session?.token ?? stored.token,
          cookie: result.cookie ?? result.session?.cookie ?? stored.cookie,
        };
        await setSession(restored);
        await setActiveUser(result.user);
        const outlet = await resolveOutlet(result);
        if (mounted) {
          setSessionState(restored);
          setUser(result.user);
          setActiveOutlet(outlet);
        }
      } catch (err: unknown) {
        // Hanya hapus auth storage jika server memberikan status 401 Unauthorized
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          await clearAuthStorage();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void restoreSession();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, passwordOrPin: string) => {
    const result = await api.auth.login(email.trim(), passwordOrPin) as AuthResponse;
    const normalized: Session = {
      ...result,
      token: result.token ?? result.session?.token,
      cookie: result.cookie ?? result.session?.cookie,
      expiresAt: result.expiresAt ?? result.session?.expiresAt,
    };
    if (!normalized.user) throw new Error('Data pengguna tidak ditemukan');
    await setSession(normalized);
    await setActiveUser(normalized.user);
    const outlet = await resolveOutlet(result);
    setSessionState(normalized);
    setUser(normalized.user);
    setActiveOutlet(outlet);
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } finally {
      await clearAuthStorage();
      setSessionState(null);
      setUser(null);
      setActiveOutlet(null);
    }
  }, []);

  const updateActiveOutlet = useCallback((outlet: Outlet) => setActiveOutlet(outlet), []);

  const value = useMemo(() => ({
    user, session, activeOutlet, isAuthenticated: Boolean(user && session), isLoading, login, logout, updateActiveOutlet,
  }), [user, session, activeOutlet, isLoading, login, logout, updateActiveOutlet]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.use(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return context;
}
