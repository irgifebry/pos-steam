"use client";

import { cn } from "@/lib/cn";
import { X } from "lucide-react";

type Variant = "info" | "success" | "error";

const variantClasses: Record<Variant, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
};

export function Toast({
  variant = "info",
  message,
  onDismiss,
}: {
  variant?: Variant;
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3 shadow-[var(--shadow-card)]",
        variantClasses[variant],
      )}
    >
      <span className="text-sm font-medium flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup"
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
