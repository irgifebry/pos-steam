import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label className="text-sm font-semibold text-ink">{label}</label>}
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}