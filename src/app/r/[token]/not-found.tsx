import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-bg text-ink">
      <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-line bg-surface p-6 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-display text-2xl font-bold text-ink">Struk tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted">
          Tautan struk tidak valid atau sudah tidak tersedia.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
