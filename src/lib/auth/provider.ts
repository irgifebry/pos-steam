import type { Auth } from "./config";

let instance: Auth | undefined;

export function setAuth(auth: Auth): void {
  instance = auth;
}

export function getAuth(): Auth {
  if (!instance) {
    throw new Error("Auth belum diinisialisasi. Panggil setAuth() lebih dulu.");
  }
  return instance;
}
