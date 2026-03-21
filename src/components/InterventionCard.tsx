import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

/** operations.intervention_type enum values */
type InterventionType =
  | "sweep"
  | "annual_service"
  | "repair"
  | "diagnostic"
  | "commissioning"
  | "installation"
  | "commercial_visit"
  | "technical_survey";

/** operations.intervention_status enum values */
type InterventionStatus = "planned" | "scheduled" | "in_progress" | "completed" | "cancelled";

const TYPE_CONFIG: Record<InterventionType, { label: string; emoji: string; borderColor: string }> = {
  sweep:             { label: "Ramonage",          emoji: "🧹", borderColor: "border-l-info" },
  annual_service:    { label: "Entretien annuel",  emoji: "🔄", borderColor: "border-l-info" },
  repair:            { label: "Réparation",        emoji: "🔧", borderColor: "border-l-destructive" },
  diagnostic:        { label: "Diagnostic",        emoji: "🔍", borderColor: "border-l-warning" },
  commissioning:     { label: "Mise en service",   emoji: "⚡", borderColor: "border-l-accent" },
  installation:      { label: "Installation",      emoji: "🏗️", borderColor: "border-l-accent" },
  commercial_visit:  { label: "Visite commerciale",emoji: "🤝", borderColor: "border-l-info" },
  technical_survey:  { label: "Visite technique",  emoji: "📋", borderColor: "border-l-warning" },
};

interface InterventionCardProps {
  type: InterventionType;
  status: InterventionStatus;
  label: string;
  customerName: string;
  address?: string;
  time: string;
  duration: string;
  techName: string;
  techColor?: string;
  priority?: "high" | "normal";
  onClick?: () => void;
  className?: string;
}

export function InterventionCard({
  type,
  status,
  label,
  customerName,
  time,
  duration,
  techName,
  techColor = "bg-muted text-muted-foreground",
  priority = "normal",
  onClick,
  className,
}: InterventionCardProps) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.repair;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-md border-l-[3px] border bg-card p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs",
        cfg.borderColor,
        priority === "high" && "ring-1 ring-destructive/20 bg-destructive/[0.02]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-mono font-medium">{time}</span>
        <span className="text-muted-foreground">{duration}</span>
      </div>

      <p className="font-medium leading-snug mb-1 line-clamp-2">{label}</p>

      <p className="text-muted-foreground truncate">{customerName}</p>

      <div className="flex items-center justify-between mt-1.5">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", techColor)}>
          {techName}
        </span>
        <div className="flex items-center gap-1">
          {priority === "high" && (
            <AlertTriangle className="h-3 w-3 text-destructive" />
          )}
          {status === "completed" && (
            <span className="text-[10px] text-accent font-medium">✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

export type { InterventionType, InterventionStatus, InterventionCardProps };
export { TYPE_CONFIG as INTERVENTION_TYPE_CONFIG };
