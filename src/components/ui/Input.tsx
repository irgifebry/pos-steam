import { cn } from "@/lib/cn";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-12 px-4 rounded-[var(--radius-md)] border bg-surface text-base text-ink placeholder:text-muted",
          "focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition",
          error ? "border-danger" : "border-line",
          className,
        )}
        {...props}
      />
    );
  },
);
