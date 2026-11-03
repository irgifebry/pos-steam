import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/lib/db/test-db";
import type { AppDatabase } from "@/lib/db/schema";
import { outlets, user as userTable, auditLogs } from "@/lib/db/schema";
import { listAuditLogs } from "./audit";

describe("audit service", () => {
  let db: AppDatabase;
  const outletId = "outlet-audit";
  const userId = "user-audit";

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/postgres";
    db = await createTestDatabase();

    await db.insert(outlets).values({ id: outletId, name: "Outlet Audit" });
    await db.insert(userTable).values({
      id: userId,
      name: "Pelaksana Audit",
      email: "audit@pos.test",
      role: "admin",
      outletId,
    });

    await db.insert(auditLogs).values([
      {
        outletId,
        userId,
        action: "order.create",
        entity: "order",
        entityId: "order-1",
        after: { total: 50000 },
      },
      {
        outletId,
        userId,
        action: "user.reset_pin",
        entity: "user",
        entityId: userId,
      },
    ]);
  });

  afterAll(async () => {
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  });

  it("mengambil daftar audit logs terurut descending", async () => {
    const logs = await listAuditLogs(db, outletId);
    expect(logs.length).toBe(2);
    expect(logs[0].actorName).toBe("Pelaksana Audit");
  });

  it("memfilter audit logs berdasarkan entitas", async () => {
    const logs = await listAuditLogs(db, outletId, { entity: "order" });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("order.create");
  });
});
