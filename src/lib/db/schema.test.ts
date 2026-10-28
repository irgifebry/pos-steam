import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDatabase } from "./test-db";
import type { AppDatabase } from "./schema";

describe("migrasi skema", () => {
  let db: AppDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("membuat seluruh 17 tabel yang diharapkan", async () => {
    const result = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = result.rows.map((row) => row.table_name).sort();
    expect(names).toEqual(
      [
        "account",
        "addons",
        "attendance",
        "audit_logs",
        "cash_shifts",
        "customers",
        "order_items",
        "orders",
        "outlets",
        "payroll_items",
        "payroll_runs",
        "payments",
        "service_packages",
        "session",
        "user",
        "verification",
        "vehicles",
      ].sort(),
    );
  });

  it("membuat unique constraint komposit pada service_packages", async () => {
    const result = await db.execute(
      sql`select constraint_name from information_schema.table_constraints where table_name = 'service_packages' and constraint_type = 'UNIQUE'`,
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });
});
