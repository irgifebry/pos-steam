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
    "inline-flex items-center justify-center gap-2 font-bold rounded-[var(--radius-md)] transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none tap-target";
  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-base",
    lg: "h-14 px-6 text-lg",
  };
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark shadow-pop",
    secondary: "bg-surface text-ink border-2 border-ink hover:bg-surface-2",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "bg-transparent text-ink hover:bg-surface-2",
    accent: "bg-accent text-ink hover:opacity-90 shadow-pop",
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
