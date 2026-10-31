import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn("bg-surface rounded-[var(--radius-lg)] border border-line p-5 shadow-[var(--shadow-card)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("font-display text-xl font-bold text-ink tracking-tight", className)}>{children}</h3>;
}
