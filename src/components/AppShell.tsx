"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, ListChecks, LogOut, RefreshCw, Settings, ShoppingCart, Users } from "lucide-react";
import { useAppSession } from "./SessionProvider";
import { BottomNav } from "./BottomNav";
import { OperatorSwitcher } from "./OperatorSwitcher";

import Image from "next/image";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading, signOut } = useAppSession();
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const isSubPage = segments.length >= 2;
  const parentPath = "/" + segments.slice(0, -1).join("/");
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden md:flex md:flex-col md:gap-6 md:bg-ink md:text-white md:px-5 md:py-6 md:rounded-r-[var(--radius-xl)]">
        <div className="flex items-center gap-3 px-1">
          <Image src="/kyane-logo.png" alt="KYANE Protect & Shine" width={1774} height={887} className="h-8 w-auto max-w-[140px] shrink-0" />
        </div>
        <nav aria-label="Menu utama" className="flex flex-col gap-1">
          {[
            { href: "/kasir", label: "Kasir", icon: ShoppingCart, roles: ["admin", "kasir"] },
            { href: "/antrean", label: "Antrean", icon: ListChecks, roles: ["admin", "kasir", "operator"] },
            { href: "/laporan", label: "Laporan", icon: BarChart3, roles: ["admin", "kasir"] },
            { href: "/karyawan", label: "Karyawan", icon: Users, roles: ["admin", "kasir"] },
            { href: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["admin"] },
          ].filter((item) => item.roles.includes(role)).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  active ? "bg-brand text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-1">
          <p className="font-display text-sm font-bold text-white">{user.name}</p>
          <p className="text-xs text-white/60 capitalize">{user.role}</p>
        </div>
      </aside>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 h-[64px] border-b border-line bg-bg/80 backdrop-blur md:h-16">
          <div className="mx-auto flex h-full max-w-lg items-center gap-3 px-4 md:max-w-none md:px-6">
            {isSubPage && (
              <Link
                href={parentPath}
                aria-label="Kembali"
                className="h-11 w-11 shrink-0 rounded-xl border border-line bg-surface flex items-center justify-center text-muted hover:text-ink"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
            )}
            <Image src="/kyane-logo.png" alt="KYANE Protect & Shine" width={1774} height={887} className="h-7 w-auto max-w-[120px] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg font-bold text-ink leading-none tracking-tight">Cuci Steam</p>
              <p className="text-sm text-muted truncate mt-1">{user.name} · {user.role}</p>
            </div>
            <button
              onClick={() => setSwitcherOpen(true)}
              className="h-11 w-11 rounded-xl border border-line bg-surface flex items-center justify-center text-brand hover:bg-brand-soft"
              aria-label="Ganti operator"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => void signOut()}
              className="h-11 w-11 rounded-xl border border-line bg-surface flex items-center justify-center text-muted hover:text-danger"
              aria-label="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-5 pb-24 md:mx-0 md:max-w-none md:px-6 md:py-6 md:pb-6">{children}</main>
        <BottomNav role={role} />
        {switcherOpen && <OperatorSwitcher onClose={() => setSwitcherOpen(false)} />}
      </div>
    </div>
  );
}
