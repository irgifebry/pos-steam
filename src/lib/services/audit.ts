import { and, desc, eq, inArray } from "drizzle-orm";
import { auditLogs, user as userTable } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/schema";

export type AuditLogView = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  actorName: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
};

export async function listAuditLogs(
  db: AppDatabase,
  outletId: string,
  opts: { limit?: number; offset?: number; entity?: string } = {},
): Promise<AuditLogView[]> {
  const filters = [
    eq(auditLogs.outletId, outletId),
    opts.entity ? eq(auditLogs.entity, opts.entity) : undefined,
  ].filter((f) => f !== undefined);

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...filters))
    .orderBy(desc(auditLogs.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);

  if (rows.length === 0) return [];

  const userIds = [
    ...new Set(rows.map((r) => r.userId).filter((id): id is string => Boolean(id))),
  ];

  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const users = await db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(inArray(userTable.id, userIds));
    for (const u of users) {
      userMap.set(u.id, u.name);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    actorId: r.userId,
    actorName: (r.userId && userMap.get(r.userId)) || "Sistem",
    before: r.before,
    after: r.after,
    createdAt: r.createdAt,
  }));
}
