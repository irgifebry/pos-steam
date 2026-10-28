"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("pos_demo_mode") === "1") {
      setDemoMode(true);
    }
  }, []);

  const user = u
    ? {
        id: String(u.id),
        name: String(u.name ?? ""),
        email: String(u.email ?? ""),
        role: (u.role as Role) ?? "kasir",
      }
    : demoMode
      ? { id: "demo", name: "Admin Demo", email: "admin@pos.test", role: "admin" as Role }
      : null;

  return (
    <SessionCtx.Provider
      value={{
        user,
        role: user?.role ?? "kasir",
        isLoading: isPending && !demoMode,
        signOut: async () => {
          if (typeof window !== "undefined") localStorage.removeItem("pos_demo_mode");
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