"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, ListChecks, LogOut, RefreshCw, Settings, ShoppingCart, Users } from "lucide-react";
import { useAppSession } from "./SessionProvider";
import { BottomNav } from "./BottomNav";

import { OperatorSwitcher } from "./OperatorSwitcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading, signOut } = useAppSession();
  const router = useRouter();
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#e9f0ed] md:grid md:grid-cols-[228px_minmax(0,1fr)] md:gap-2 md:p-2">
      <aside className="hidden md:flex md:flex-col md:gap-8 md:px-4 md:py-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c-3 4-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-2-5-5-9z" /></svg></div>
          <span className="font-display text-base font-bold text-ink">Cuci Steam</span>
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
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm ${active ? "bg-[#dce4e1] text-ink" : "text-muted hover:text-ink"}`}><Icon className="h-4 w-4" />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto px-2 text-sm text-muted">{user.name}<br /><span className="capitalize">{user.role}</span></div>
      </aside>
      <div className="min-h-screen overflow-hidden bg-surface md:min-h-[calc(100vh-16px)] md:rounded-2xl md:border md:border-[#dfe6e3]">
      <header className="sticky top-0 z-30 h-[57px] border-b border-line bg-bg md:h-12 md:border-0">
        <div className="mx-auto flex h-full max-w-lg items-center gap-3 px-4 md:max-w-none md:px-6">
          <div className="h-11 w-11 rounded-2xl bg-brand text-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3c-3 4-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-2-5-5-9z" />
              <path d="M9 14c.6.8 1.4 1.2 3 1.2s2.4-.4 3-1.2" opacity="0.6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-bold text-ink leading-none tracking-tight">Cuci Steam</p>
            <p className="text-sm text-muted truncate mt-1">{user.name} · {user.role}</p>
          </div>
          <button
            onClick={() => setSwitcherOpen(true)}
            className="h-10 w-10 rounded-xl border border-line bg-surface flex items-center justify-center text-brand hover:bg-brand-soft"
            aria-label="Ganti operator"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => void signOut()}
            className="h-10 w-10 rounded-xl border border-line bg-surface flex items-center justify-center text-muted hover:text-danger"
            aria-label="Keluar"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 pb-24 md:mx-0 md:max-w-none md:px-6 md:py-6 md:pb-6">{children}</main>
      <BottomNav role={role} />

      {switcherOpen && <OperatorSwitcher onClose={() => setSwitcherOpen(false)} />}
      </div>
    </div>
  );
}
