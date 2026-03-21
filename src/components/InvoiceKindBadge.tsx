import { cn } from "@/lib/utils";

/** billing.invoice_kind : 'deposit' | 'final' | 'service' | 'credit_note' */
type InvoiceKind = "deposit" | "final" | "service" | "credit_note";

const CONFIG: Record<InvoiceKind, { label: string; className: string }> = {
  deposit:     { label: "Acompte",      className: "bg-info/15 text-info" },
  final:       { label: "Solde",        className: "bg-accent/15 text-accent" },
  service:     { label: "Intervention", className: "bg-warning/15 text-warning" },
  credit_note: { label: "Avoir",        className: "bg-destructive/10 text-destructive" },
};

interface InvoiceKindBadgeProps {
  kind: InvoiceKind;
  size?: "sm" | "md";
  className?: string;
}

export function InvoiceKindBadge({ kind, size = "sm", className }: InvoiceKindBadgeProps) {
  const cfg = CONFIG[kind] ?? CONFIG.final;
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

export type { InvoiceKind, InvoiceKindBadgeProps };
