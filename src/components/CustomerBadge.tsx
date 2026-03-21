import { cn } from "@/lib/utils";

/** core.customer_type : 'particulier' | 'professionnel' | 'collectivite' */
type CustomerType = "particulier" | "professionnel" | "collectivite";

const CONFIG: Record<CustomerType, { label: string; className: string }> = {
  particulier:   { label: "Particulier",   className: "bg-info/15 text-info" },
  professionnel: { label: "Professionnel", className: "bg-accent/15 text-accent" },
  collectivite:  { label: "Collectivité", className: "bg-warning/15 text-warning" },
};

interface CustomerBadgeProps {
  customerType: CustomerType;
  size?: "sm" | "md";
  className?: string;
}

export function CustomerBadge({ customerType, size = "sm", className }: CustomerBadgeProps) {
  const cfg = CONFIG[customerType] ?? CONFIG.particulier;
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

export type { CustomerType, CustomerBadgeProps };
