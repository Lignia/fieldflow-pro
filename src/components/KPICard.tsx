import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  trend?: { value: number; label: string };
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({ label, value, trend, icon, className }: KPICardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight font-mono">{value}</p>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend.value > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
          ) : trend.value < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span
            className={cn(
              "font-medium",
              trend.value > 0 && "text-accent",
              trend.value < 0 && "text-destructive",
              trend.value === 0 && "text-muted-foreground"
            )}
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
