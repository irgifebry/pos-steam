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
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      requireEmailVerification: false,
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {},
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "kasir", input: false },
        phone: { type: "string", required: false, input: false },
        outletId: { type: "string", required: false, input: false },
        dailyRate: { type: "number", required: false, defaultValue: 0, input: false },
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
