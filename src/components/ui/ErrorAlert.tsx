import { cn } from "@/lib/cn";

export function ErrorAlert({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-4 py-3 text-danger",
        className,
      )}
    >
      <span className="text-sm font-medium flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold underline"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
