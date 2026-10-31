import { createAuthClient } from "better-auth/react";

function resolveBaseUrl(): string | undefined {
  if (typeof window !== "undefined") return window.location.origin;
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

export const authClient = createAuthClient({
  baseURL: resolveBaseUrl(),
});