import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Session, User } from '../types';

const KEYS = { session: '@pos/session', user: '@pos/user' } as const;

// Base URL produksi. Atur EXPO_PUBLIC_API_BASE_URL saat build untuk mengarahkan
// aplikasi ke backend yang di-deploy (mis. https://pos-api.vercel.app).
// Jika kosong, pakai alamat development di bawah.
const PRODUCTION_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

// Alamat server backend embedded (otomatis menyesuaikan host IP Expo atau default LAN)
export function getEmbeddedBaseUrl(): string {
  if (PRODUCTION_BASE_URL) return PRODUCTION_BASE_URL;

  // Ambil host IP dari Expo saat dibuka via Expo Go di HP atau simulator
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3001`;
    }
  }

  // Fallback IP LAN mesin host tempat Next.js berjalan
  return 'http://192.168.101.4:3001';
}

export const EMBEDDED_BASE_URL = getEmbeddedBaseUrl();

export async function getBaseUrl(): Promise<string> {
  if (PRODUCTION_BASE_URL) return PRODUCTION_BASE_URL;

  // Di web preview, pakai localhost supaya cookie session SameSite=Lax ikut terkirim
  // (host berbeda di HP/native sudah ditangani getEmbeddedBaseUrl).
  if (Platform.OS === 'web') return 'http://localhost:3001';
  return getEmbeddedBaseUrl();
}

export function normalizeBaseUrl(input: string): string {
  return getEmbeddedBaseUrl();
}

export async function setBaseUrl(_url: string): Promise<void> {
  // Server URL sudah embedded permanen
}

export async function getSession(): Promise<Session | null> {
  const value = await AsyncStorage.getItem(KEYS.session);
  if (!value) return null;
  try {
    return JSON.parse(value) as Session;
  } catch {
    await AsyncStorage.removeItem(KEYS.session);
    return null;
  }
}

export async function setSession(session: Session | null): Promise<void> {
  if (session) await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
  else await AsyncStorage.removeItem(KEYS.session);
}

export async function getActiveUser(): Promise<User | null> {
  const value = await AsyncStorage.getItem(KEYS.user);
  if (!value) return null;
  try {
    return JSON.parse(value) as User;
  } catch {
    await AsyncStorage.removeItem(KEYS.user);
    return null;
  }
}

export async function setActiveUser(user: User | null): Promise<void> {
  if (user) await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
  else await AsyncStorage.removeItem(KEYS.user);
}

export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.session, KEYS.user]);
}
