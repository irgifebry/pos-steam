"use client";

import { createContext, useContext } from "react";
import { authClient } from "@/lib/auth/client";
import type { Role } from "@/lib/types";

type Ctx = {
  user: { id: string; name: string; email: string; role: Role } | null;
  role: Role;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx>({
  user: null,
  role: "kasir",
  isLoading: true,
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const u = data?.user as Record<string, unknown> | undefined;
  const validRoles: Role[] = ["admin", "kasir", "operator"];
  const rawRole = u?.role;
  const role: Role = validRoles.includes(rawRole as Role) ? (rawRole as Role) : "kasir";

  const user = u
    ? {
        id: String(u.id),
        name: String(u.name ?? ""),
        email: String(u.email ?? ""),
        role,
      }
    : null;

  return (
    <SessionCtx.Provider
      value={{
        user,
        role: user?.role ?? "kasir",
        isLoading: isPending,
        signOut: async () => {
          try {
            await authClient.signOut();
          } catch {
            // ignore
          }
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/login");
        },
      }}
    >
      {children}
    </SessionCtx.Provider>
  );
}

export function useAppSession() {
  return useContext(SessionCtx);
}