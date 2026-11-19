import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Session, User } from '../types';

const KEYS = { baseUrl: '@pos/base-url', session: '@pos/session', user: '@pos/user' } as const;

export function resolveDefaultBaseUrl(): string {
  // Ambil hostUri dari Expo saat dibuka via Expo Go di HP atau simulator
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://192.168.101.4:3000';
  }

  // Fallback ke IP LAN laptop tempat server Next.js berjalan
  return 'http://192.168.101.4:3000';
}

export const DEFAULT_BASE_URL = resolveDefaultBaseUrl();

export async function getBaseUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(KEYS.baseUrl);
  if (saved) return saved.replace(/\/+$/, '');
  return resolveDefaultBaseUrl();
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
