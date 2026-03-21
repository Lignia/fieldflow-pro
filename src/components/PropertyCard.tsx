import { cn } from "@/lib/utils";
import { Home, Building2, Store, MapPin, Wrench } from "lucide-react";

type PropertyType = "house" | "apartment" | "commercial" | "other";

const PROPERTY_ICONS: Record<PropertyType, React.ReactNode> = {
  house:      <Home className="h-4 w-4" />,
  apartment:  <Building2 className="h-4 w-4" />,
  commercial: <Store className="h-4 w-4" />,
  other:      <MapPin className="h-4 w-4" />,
};

const PROPERTY_LABELS: Record<PropertyType, string> = {
  house:      "Maison",
  apartment:  "Appartement",
  commercial: "Local commercial",
  other:      "Autre",
};

interface PropertyCardProps {
  label?: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  propertyType?: PropertyType;
  installationCount?: number;
  onClick?: () => void;
  className?: string;
}

export function PropertyCard({
  label,
  addressLine1,
  city,
  postalCode,
  propertyType = "house",
  installationCount,
  onClick,
  className,
}: PropertyCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/20 cursor-pointer",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-accent transition-colors">
          {PROPERTY_ICONS[propertyType]}
        </div>
        <div className="min-w-0 flex-1">
          {label && (
            <p className="text-sm font-medium group-hover:text-accent transition-colors">
              {label}
            </p>
          )}
          <p className={cn("text-sm", label ? "text-muted-foreground" : "font-medium group-hover:text-accent transition-colors")}>
            {addressLine1}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {postalCode} {city}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">
              {PROPERTY_LABELS[propertyType]}
            </span>
            {installationCount != null && (
              <span className="inline-flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {installationCount} équipement{installationCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PropertyType, PropertyCardProps };
