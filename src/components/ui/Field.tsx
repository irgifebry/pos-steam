import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      {children}
      {error && <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-sm text-danger">{error}</p>}
      {!error && hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}