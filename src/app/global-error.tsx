'use client';

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex items-center justify-center px-4 py-8 bg-bg text-ink font-sans">
        <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-line bg-surface p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-display text-2xl font-bold text-ink">Terjadi kesalahan</h1>
          <p role="alert" className="mt-2 text-sm text-muted">
            {error?.message || "Maaf, terjadi kesalahan tak terduga."}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Coba lagi
            </button>
            <Link
              href="/"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-bg"
            >
              Ke beranda
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
