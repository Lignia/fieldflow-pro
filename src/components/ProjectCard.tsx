import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { MapPin, Calendar, ChevronRight } from "lucide-react";

interface ProjectCardProps {
  projectNumber: string;
  status: string;
  customerName: string;
  propertyCity: string;
  amount?: number | null;
  origin?: string;
  date: string;
  type?: string;
  onClick?: () => void;
  className?: string;
}

const originLabels: Record<string, string> = {
  manual: "Manuel",
  phone: "Téléphone",
  web: "Web",
  referral: "Parrainage",
  api: "API",
  showroom: "Showroom",
  fair: "Salon",
  partner: "Partenaire",
};

export function ProjectCard({
  projectNumber,
  status,
  customerName,
  propertyCity,
  amount,
  date,
  type,
  onClick,
  className,
}: ProjectCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/20 cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">{projectNumber}</span>
        <StatusBadge status={status} type="project" />
      </div>

      <p className="font-medium text-sm group-hover:text-accent transition-colors mb-1">
        {customerName}
      </p>

      {type && (
        <p className="text-xs text-muted-foreground mb-2">{type}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {propertyCity}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {date}
        </span>
      </div>

      {amount != null && (
        <p className="font-mono text-sm font-semibold mt-2">
          {amount.toLocaleString("fr-FR")} € TTC
        </p>
      )}

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export type { ProjectCardProps };
export { originLabels };
