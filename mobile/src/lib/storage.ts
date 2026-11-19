import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '../types';

const KEYS = { baseUrl: '@pos/base-url', session: '@pos/session', user: '@pos/user' } as const;
export const DEFAULT_BASE_URL = 'http://localhost:3000';

export async function getBaseUrl(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.baseUrl))?.replace(/\/+$/, '') || DEFAULT_BASE_URL;
}
export async function setBaseUrl(url: string): Promise<void> {
  const normalized = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalized)) throw new Error('Base URL harus menggunakan http:// atau https://');
  await AsyncStorage.setItem(KEYS.baseUrl, normalized);
}
export async function getSession(): Promise<Session | null> {
  const value = await AsyncStorage.getItem(KEYS.session);
  if (!value) return null;
  try { return JSON.parse(value) as Session; } catch { await AsyncStorage.removeItem(KEYS.session); return null; }
}
export async function setSession(session: Session | null): Promise<void> {
  if (session) await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
  else await AsyncStorage.removeItem(KEYS.session);
}
export async function getActiveUser(): Promise<User | null> {
  const value = await AsyncStorage.getItem(KEYS.user);
  if (!value) return null;
  try { return JSON.parse(value) as User; } catch { await AsyncStorage.removeItem(KEYS.user); return null; }
}
export async function setActiveUser(user: User | null): Promise<void> {
  if (user) await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
  else await AsyncStorage.removeItem(KEYS.user);
}
export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.session, KEYS.user]);
}
