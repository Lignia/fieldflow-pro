import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SummaryItem {
  label: string;
  value: React.ReactNode;
  /** Si true, valeur affichée en mono (chiffres, montants) */
  mono?: boolean;
  /** Icône optionnelle devant le label */
  icon?: LucideIcon;
}

export interface SummaryCardProps {
  /** Titre de la synthèse */
  title?: string;
  /** Sous-titre / description */
  description?: string;
  /** Liste de couples label / valeur */
  items: SummaryItem[];
  /** Phrase de conclusion (ex: "✅ Qualification solide") */
  footnote?: string;
  /** Badge global (statut, score…) */
  badge?: { label: string; variant?: React.ComponentProps<typeof Badge>["variant"] };
  /** Disposition : liste verticale ou grille 2 colonnes */
  layout?: "list" | "grid";
  variant?: "default" | "muted";
  className?: string;
}

/**
 * SummaryCard — Carte de synthèse réutilisable.
 * Pattern : titre + liste label/valeur + note de conclusion.
 * Idéal pour récap de formulaire, résumé client, totaux devis.
 */
export function SummaryCard({
  title,
  description,
  items,
  footnote,
  badge,
  layout = "list",
  variant = "default",
  className,
}: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "p-5",
        variant === "muted" && "bg-muted/30 border-border",
        className,
      )}
    >
      {(title || badge) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold leading-tight">{title}</h3>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {badge && (
            <Badge variant={badge.variant ?? "secondary"} className="shrink-0">
              {badge.label}
            </Badge>
          )}
        </div>
      )}

      <dl
        className={cn(
          layout === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5"
            : "flex flex-col gap-2.5",
        )}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              {item.icon && <item.icon className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
            </dt>
            <dd
              className={cn(
                "text-right text-foreground font-medium min-w-0",
                item.mono && "font-mono",
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {footnote && (
        <p className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
          {footnote}
        </p>
      )}
    </Card>
  );
}