export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center animate-spin rounded-full border-2 border-current border-t-transparent align-middle ${className}`}
      aria-label="Memuat"
      role="status"
    />
  );
}