import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

const swSelf = self as unknown as { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined };

const runtimeCaching = defaultCache.filter((entry) => {
  // Jangan cache endpoint API sensitif — selalu network.
  const urlPattern = (entry as { urlPattern?: RegExp | string }).urlPattern;
  const source = typeof urlPattern === "string" ? urlPattern : urlPattern?.source ?? "";
  return !source.includes("/api/");
});

const serwist = new Serwist({
  // @ts-expect-error serwist webpack plugin replaces this literal
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: { entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }] },
});

serwist.addEventListeners();