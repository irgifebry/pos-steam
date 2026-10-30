"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ListChecks, ShoppingCart, Settings, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";

const tabs: { href: string; label: string; icon: typeof ShoppingCart; roles: Role[] }[] = [
  { href: "/kasir", label: "Kasir", icon: ShoppingCart, roles: ["admin", "kasir"] },
  { href: "/antrean", label: "Antrean", icon: ListChecks, roles: ["admin", "kasir", "operator"] },
  { href: "/laporan", label: "Laporan", icon: BarChart3, roles: ["admin", "kasir"] },
  { href: "/karyawan", label: "Karyawan", icon: Users, roles: ["admin", "kasir"] },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["admin"] },
];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleTabs = tabs.filter((t) => t.roles.includes(role));
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface md:hidden">
      <div
        className="mx-auto max-w-lg grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(visibleTabs.length, 1)}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium tap-target",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon className={cn("h-6 w-6", active && "text-ink")} />
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5",
                    active ? "bg-stone-200" : "bg-transparent",
                  )}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
