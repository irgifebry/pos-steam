import { createDatabase } from "@/lib/db/client";
import { hasDatabase, setDatabase } from "@/lib/db/provider";
import { createAuth } from "@/lib/auth/config";
import { hasAuth, setAuth } from "@/lib/auth/provider";
import { getEnv } from "@/lib/env";

let initialized = false;

export async function initializeServer(): Promise<void> {
  if (initialized) return;
  if (hasDatabase() && hasAuth()) {
    initialized = true;
    return;
  }

  const env = getEnv();
  const db = createDatabase(env.DATABASE_URL);
  setDatabase(db);
  setAuth(createAuth(db, { nextCookies: true }));
  initialized = true;
}
