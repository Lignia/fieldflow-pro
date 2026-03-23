import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: string;
  icon?: LucideIcon;
  variant?: "default" | "warning" | "danger";
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  subLabel,
  trend,
  icon: Icon,
  variant = "default",
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-5 transition-shadow",
        variant === "warning" && "border-warning/40",
        variant === "danger" && "border-destructive/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              variant === "danger"
                ? "text-destructive/60"
                : variant === "warning"
                ? "text-warning/70"
                : "text-muted-foreground/50"
            )}
          />
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight font-mono tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded",
              trend.startsWith("+")
                ? "bg-success/10 text-success"
                : trend.startsWith("-")
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            {trend}
          </span>
        )}
      </div>

      {subLabel && (
        <p
          className={cn(
            "mt-1.5 text-xs",
            variant === "danger" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {subLabel}
        </p>
      )}
    </Card>
  );
}
