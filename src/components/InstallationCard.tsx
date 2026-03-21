import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { Flame, Calendar, Wrench } from "lucide-react";

/** core.installation_status enum values */
type InstallationStatus = "draft" | "planned" | "installed" | "commissioned" | "active";

interface InstallationCardProps {
  deviceType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: InstallationStatus;
  commissioningDate?: string;
  nextSweepDate?: string;
  nextServiceDate?: string;
  onClick?: () => void;
  className?: string;
}

export function InstallationCard({
  deviceType,
  brand,
  model,
  serialNumber,
  status,
  commissioningDate,
  nextSweepDate,
  nextServiceDate,
  onClick,
  className,
}: InstallationCardProps) {
  const equipmentLabel = [brand, model].filter(Boolean).join(" ");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/20 cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent shrink-0" />
          <p className="font-medium text-sm group-hover:text-accent transition-colors">
            {deviceType}
          </p>
        </div>
        <StatusBadge status={status} type="installation" />
      </div>

      {equipmentLabel && (
        <p className="text-sm text-muted-foreground mb-1">{equipmentLabel}</p>
      )}

      {serialNumber && (
        <p className="text-xs font-mono text-muted-foreground mb-2">
          S/N {serialNumber}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
        {commissioningDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            MES {commissioningDate}
          </span>
        )}
        {nextSweepDate && (
          <span className="inline-flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            Ramonage {nextSweepDate}
          </span>
        )}
        {nextServiceDate && (
          <span className="inline-flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            Entretien {nextServiceDate}
          </span>
        )}
      </div>
    </div>
  );
}

export type { InstallationStatus, InstallationCardProps };
