import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL belum diisi"),
  DIRECT_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET minimal 32 karakter"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL harus berupa URL"),
  WEB_ORIGIN: z.string().url("WEB_ORIGIN harus berupa URL"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID belum diisi"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET belum diisi"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const name = issue.path.join(".");
    throw new Error(`Environment variable ${name} belum diisi atau tidak valid: ${issue.message}`);
  }
  return parsed.data;
}
