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
export function normalizeBaseUrl(input: string): string {
  let trimmed = input.trim();
  // Jika user memasukkan alamat exp://192.168.1.x:8081 atau sejenisnya
  if (trimmed.startsWith('exp://')) {
    trimmed = trimmed.replace('exp://', 'http://');
    // Ganti port Metro bundler 8081 jika ada ke port 3000 Next.js
    if (trimmed.includes(':8081')) {
      trimmed = trimmed.replace(':8081', ':3000');
    }
  } else if (!/^https?:\/\//i.test(trimmed)) {
    // Jika tidak ada protokol, defaultkan ke http://
    trimmed = `http://${trimmed}`;
  }

  // Jika user hanya memasukkan IP atau host tanpa port, dan bukan domain https baku
  try {
    const parsed = new URL(trimmed);
    if (!parsed.port && parsed.hostname !== 'localhost' && !parsed.hostname.includes('.vercel.app')) {
      parsed.port = '3000';
      trimmed = parsed.toString();
    }
  } catch {
    // Biarkan jika format belum selesai diketik
  }

  return trimmed.replace(/\/+$/, '');
}

export async function setBaseUrl(url: string): Promise<void> {
  const normalized = normalizeBaseUrl(url);
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
