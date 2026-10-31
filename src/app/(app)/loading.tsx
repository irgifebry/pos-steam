export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-4 py-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-line bg-surface p-6 text-center shadow-[var(--shadow-card)]">
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm text-muted">Memuat...</p>
      </div>
    </div>
  );
}
