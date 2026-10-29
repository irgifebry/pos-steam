"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ReceiptText } from "lucide-react";

export default function ReceiptPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-bg px-5 py-12 text-ink">
      <section
        aria-labelledby="receipt-title"
        className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center"
      >
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand">
          <ReceiptText aria-hidden="true" className="size-9" />
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand">
          Bukti transaksi
        </p>
        <h1 id="receipt-title" className="font-display text-3xl font-bold tracking-tight">
          Struk belum tersedia
        </h1>
        <p role="status" className="mt-4 max-w-sm text-muted">
          Data struk tidak dapat ditampilkan saat ini. Layanan struk belum tersedia, jadi
          kami tidak dapat memuat detail transaksi.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="tap-target inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Coba lagi
          </button>
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 py-3 font-semibold text-ink hover:bg-bg"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
