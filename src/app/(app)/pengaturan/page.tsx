"use client";

import Link from "next/link";
import {
  Package,
  Puzzle,
  Store,
  Landmark,
  Users,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

const menus = [
  {
    href: "/pengaturan/paket",
    title: "Paket Layanan",
    desc: "Atur paket cuci motor & mobil",
    icon: Package,
    tone: "bg-brand-soft text-brand",
  },
  {
    href: "/pengaturan/add-on",
    title: "Add-on",
    desc: "Layanan tambahan (wax, dll)",
    icon: Puzzle,
    tone: "bg-accent-soft text-amber-800",
  },
  {
    href: "/pengaturan/outlet",
    title: "Data Outlet",
    desc: "Nama, alamat, pajak, footer struk",
    icon: Store,
    tone: "bg-info-soft text-info",
  },
  {
    href: "/pengaturan/bank",
    title: "Bank",
    desc: "Rekening untuk pembayaran",
    icon: Landmark,
    tone: "bg-success-soft text-success",
  },
  {
    href: "/pengaturan/pengguna",
    title: "Pengguna",
    desc: "Akun admin, kasir, operator",
    icon: Users,
    tone: "bg-brand-soft text-brand",
  },
  {
    href: "/pengaturan/gaji-kas",
    title: "Gaji & Kas",
    desc: "Gaji harian & kas outlet",
    icon: Wallet,
    tone: "bg-accent-soft text-amber-800",
  },
];

export default function PengaturanIndex() {
  const { role, isLoading } = useAppSession();
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Spinner className="text-brand" />
      </div>
    );
  }
  if (role !== "admin") {
    return (
      <Card className="text-center text-muted py-10">
        <p>Hanya admin yang dapat mengakses halaman ini.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-36">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Pengaturan</h1>
        <p className="text-muted mt-1">Atur data outlet dan layanan</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {menus.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className="block">
              <Card className="group flex min-h-28 items-center gap-4 transition hover:border-brand">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${m.tone}`}>
                  <Icon className="h-7 w-7 transition-transform group-hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-bold text-ink">{m.title}</p>
                  <p className="text-sm text-muted">{m.desc}</p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted shrink-0" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
