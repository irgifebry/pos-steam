import { cn } from "@/lib/cn";

export function Spinner({ className = "", label = "Memuat" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center animate-spin rounded-full border-2 border-current border-t-transparent align-middle",
        className,
      )}
      aria-label={label}
      role="status"
    />
  );
}