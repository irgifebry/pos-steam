import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-sm)] transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none tap-target";
  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-base",
    lg: "h-14 px-6 text-lg",
  };
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    secondary: "bg-surface text-ink border border-line hover:bg-bg",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "bg-transparent text-brand hover:bg-brand-soft",
    accent: "bg-accent text-ink hover:opacity-90",
  };
  return (
    <button
      className={cn(base, sizes[size], variants[variant], fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </button>
  );
}