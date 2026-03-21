import { cn } from "@/lib/utils";

/** billing.quote_kind : 'estimate' | 'final' | 'service' */
type QuoteKind = "estimate" | "final" | "service";

const CONFIG: Record<QuoteKind, { label: string; className: string }> = {
  estimate: { label: "Estimatif", className: "bg-info/15 text-info" },
  final:    { label: "Définitif", className: "bg-accent/15 text-accent" },
  service:  { label: "SAV",       className: "bg-warning/15 text-warning" },
};

interface QuoteKindBadgeProps {
  kind: QuoteKind;
  size?: "sm" | "md";
  className?: string;
}

export function QuoteKindBadge({ kind, size = "sm", className }: QuoteKindBadgeProps) {
  const cfg = CONFIG[kind] ?? CONFIG.estimate;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" && "px-2.5 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}

export type { QuoteKind, QuoteKindBadgeProps };
