import * as React from "react";
import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type StepStatus = "pending" | "current" | "done" | "skipped";

export interface StepCardProps {
  /** Index 1-based de l'étape (ex: 1, 2, 3) */
  step: number;
  /** Titre de l'étape */
  title: string;
  /** Description courte */
  description?: string;
  /** Icône optionnelle (remplace le numéro si status !== done) */
  icon?: LucideIcon;
  /** Statut de l'étape */
  status?: StepStatus;
  /** Badge contextuel (ex: "Recommandé") */
  badge?: { label: string; variant?: React.ComponentProps<typeof Badge>["variant"] };
  /** Au clic — rend la carte actionnable */
  onClick?: () => void;
  /** Contenu additionnel sous la description */
  children?: React.ReactNode;
  className?: string;
}

const STATUS_STYLES: Record<StepStatus, { card: string; circle: string; title: string }> = {
  pending: {
    card: "border-border bg-card opacity-70",
    circle: "bg-muted text-muted-foreground border-border",
    title: "text-foreground",
  },
  current: {
    card: "border-2 border-primary bg-primary/[0.04] shadow-sm",
    circle: "bg-primary text-primary-foreground border-primary",
    title: "text-foreground",
  },
  done: {
    card: "border-border bg-card",
    circle: "bg-success text-success-foreground border-success",
    title: "text-muted-foreground line-through decoration-1",
  },
  skipped: {
    card: "border-dashed border-border bg-muted/20",
    circle: "bg-muted text-muted-foreground border-dashed border-border",
    title: "text-muted-foreground italic",
  },
};

/**
 * StepCard — Carte d'étape réutilisable.
 * Pattern : numéro + titre + description, avec statut visuel.
 * Idéal pour stepper de formulaire, parcours de qualification, onboarding.
 */
export function StepCard({
  step,
  title,
  description,
  icon: Icon,
  status = "pending",
  badge,
  onClick,
  children,
  className,
}: StepCardProps) {
  const styles = STATUS_STYLES[status];
  const interactive = !!onClick;

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        styles.card,
        interactive && "cursor-pointer hover:shadow-md hover:border-primary/40",
        className,
      )}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            styles.circle,
          )}
        >
          {status === "done" ? (
            <Check className="h-4 w-4" />
          ) : Icon ? (
            <Icon className="h-4 w-4" />
          ) : (
            <span className="font-mono">{step}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn("text-sm font-semibold leading-tight", styles.title)}>
              {title}
            </h4>
            {badge && (
              <Badge variant={badge.variant ?? "secondary"} className="shrink-0">
                {badge.label}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </Card>
  );
}