import { headers } from "next/headers";
import { getAuth } from "./provider";
import { HttpError } from "@/lib/http";
import { roleSchema } from "@/lib/schemas";
import type { Role } from "@/lib/types";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  outletId: string | null;
  phone: string;
  dailyRate: number;
  active: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = session.user as Record<string, unknown>;
  if (user.active === false) return null;

  const role = roleSchema.safeParse(user.role);
  return {
    id: String(user.id),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    role: role.success ? role.data : "kasir",
    outletId: (user.outletId as string | null | undefined) ?? null,
    phone: String(user.phone ?? ""),
    dailyRate: Number(user.dailyRate ?? 0),
    active: true,
  };
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Silakan masuk kembali");
  }
  if (roles && !roles.includes(user.role)) {
    throw new HttpError(403, "FORBIDDEN", "Akses ditolak");
  }
  return user;
}
