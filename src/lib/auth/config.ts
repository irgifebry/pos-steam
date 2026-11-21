import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import type { AppDatabase } from "@/lib/db/schema";
import * as authSchema from "@/lib/db/schema";
import { getEnv } from "@/lib/env";

export function createAuth(
  database: AppDatabase,
  options: { nextCookies?: boolean } = { nextCookies: true },
) {
  const env = getEnv();

  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: Array.from(
      new Set(
        [
          env.WEB_ORIGIN,
          env.BETTER_AUTH_URL,
          // Izinkan request autentikasi dari Expo mobile app dan IP jaringan lokal
          "exp://*",
          "http://localhost:*",
          "http://127.0.0.1:*",
          "http://192.168.*:*",
          "http://10.*:*",
          "http://172.*:*",
        ]
          .flatMap((v) => v.split(","))
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => {
            if (v.includes("*")) return v;
            try {
              return new URL(v).origin;
            } catch {
              return v;
            }
          }),
      ),
    ),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "admin", input: false },
        phone: { type: "string", required: false, input: false },
        outletId: { type: "string", required: false, input: false },
        active: { type: "boolean", required: false, defaultValue: true, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    plugins: options.nextCookies ? [nextCookies()] : [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
