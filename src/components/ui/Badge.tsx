import { cn } from "@/lib/cn";

const tones = {
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-amber-800",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  muted: "bg-stone-100 text-muted",
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
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}