import { cn } from "@/lib/cn";

const tones = {
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-cyan-900",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  muted: "bg-surface-2 text-muted",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "muted",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-tight", tones[tone], className)}>
      {children}
    </span>
  );
}
