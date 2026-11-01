"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ListChecks, ShoppingCart, Settings, Users } from "lucide-react";
import { cn } from "@/lib/cn";


const tabs: { href: string; label: string; icon: typeof ShoppingCart }[] = [
  { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  { href: "/antrean", label: "Antrean", icon: ListChecks },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/karyawan", label: "Karyawan", icon: Users },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const visibleTabs = tabs;
  return (
    <nav aria-label="Menu bawah" className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface md:hidden">
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
                  "flex flex-col items-center justify-center gap-1 py-2 text-xs font-bold tap-target transition",
                  active ? "text-brand" : "text-muted",
                )}
              >
                <Icon className={cn("h-6 w-6", active && "text-brand")} />
                <span>{t.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}