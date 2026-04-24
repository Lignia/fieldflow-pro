import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ActionCardAction {
  label: string;
  onClick: () => void;
  variant?: React.ComponentProps<typeof Button>["variant"];
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
}

export interface ActionCardProps {
  /** Petite étiquette en haut, ex: "Action recommandée" */
  eyebrow?: string;
  /** Titre principal */
  title: string;
  /** Description courte sous le titre */
  description?: string;
  /** Icône optionnelle à gauche du titre */
  icon?: LucideIcon;
  /** Badge contextuel (statut, priorité…) */
  badge?: { label: string; variant?: React.ComponentProps<typeof Badge>["variant"] };
  /** Action principale (CTA) */
  primaryAction?: ActionCardAction;
  /** Actions secondaires */
  secondaryActions?: ActionCardAction[];
  /** Variante visuelle */
  variant?: "default" | "accent" | "warning" | "danger";
  className?: string;
  children?: React.ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<ActionCardProps["variant"]>, string> = {
  default: "border-border bg-card",
  accent: "border-2 border-accent bg-accent/[0.08] shadow-sm",
  warning: "border-2 border-warning/60 bg-warning/[0.08]",
  danger: "border-2 border-destructive/60 bg-destructive/[0.06]",
};

const EYEBROW_STYLES: Record<NonNullable<ActionCardProps["variant"]>, string> = {
  default: "text-muted-foreground",
  accent: "text-accent",
  warning: "text-warning",
  danger: "text-destructive",
};

/**
 * ActionCard — Carte « action recommandée » réutilisable.
 * Pattern : eyebrow + titre + description + CTA(s).
 */
export function ActionCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  primaryAction,
  secondaryActions,
  variant = "default",
  className,
  children,
}: ActionCardProps) {
  return (
    <Card className={cn("p-5", VARIANT_STYLES[variant], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className={cn("text-xs uppercase tracking-wider font-bold mb-1.5", EYEBROW_STYLES[variant])}>
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-foreground" />}
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {badge && (
          <Badge variant={badge.variant ?? "secondary"} className="shrink-0">
            {badge.label}
          </Badge>
        )}
      </div>

      {children && <div className="mt-3">{children}</div>}

      {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {primaryAction && (
            <Button
              variant={primaryAction.variant ?? "default"}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
            >
              {primaryAction.icon && <primaryAction.icon />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryActions?.map((action, i) => (
            <Button
              key={i}
              variant={action.variant ?? "outline"}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
            >
              {action.icon && <action.icon />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}