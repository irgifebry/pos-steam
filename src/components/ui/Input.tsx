import { cn } from "@/lib/cn";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  function Input(
    {
      className,
      error,
      id,
      required,
      "aria-describedby": ariaDescribed,
      "aria-invalid": ariaInvalid,
      "aria-required": ariaRequired,
      ...props
    },
    ref,
  ) {
    const described = error && id ? `${id}-error` : undefined;
    const merged =
      [described, ariaDescribed].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" ") || undefined;
    return (
      <input
        ref={ref}
        id={id}
        required={required}
        className={cn(
          "w-full h-12 px-4 rounded-[var(--radius-md)] border bg-surface text-base text-ink placeholder:text-muted",
          "focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition",
          error ? "border-danger" : "border-line",
          className,
        )}
        {...props}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={merged ?? ariaDescribed}
        aria-required={required ? true : ariaRequired}
      />
    );
  },
);

Input.displayName = "Input";
