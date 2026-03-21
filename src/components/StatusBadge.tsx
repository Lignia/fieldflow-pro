import { cn } from "@/lib/utils";

type StatusType = "project" | "quote" | "invoice" | "intervention" | "service_request";

const STATUS_COLORS: Record<string, string> = {
  // Projects
  lead_new: "bg-blue-100 text-blue-700",
  lead_qualified: "bg-blue-200 text-blue-800",
  survey_scheduled: "bg-amber-100 text-amber-700",
  survey_completed: "bg-amber-200 text-amber-800",
  quote_pending: "bg-orange-100 text-orange-700",
  quote_sent: "bg-orange-200 text-orange-800",
  quote_signed: "bg-accent/15 text-accent",
  installation_scheduled: "bg-accent/15 text-accent",
  installation_in_progress: "bg-accent/20 text-accent",
  installation_completed: "bg-accent/25 text-accent",
  project_closed: "bg-muted text-muted-foreground",
  project_cancelled: "bg-destructive/10 text-destructive",

  // Quotes
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-accent/15 text-accent",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-warning/15 text-warning",

  // Invoices
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-accent/15 text-accent",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",

  // Interventions
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-accent/15 text-accent",
  completed: "bg-accent/20 text-accent",
  reported: "bg-amber-100 text-amber-700",

  // Service requests
  new: "bg-blue-100 text-blue-700",
  qualified: "bg-amber-100 text-amber-700",
  planned: "bg-accent/15 text-accent",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  lead_new: "Nouveau lead",
  lead_qualified: "Lead qualifié",
  survey_scheduled: "VT planifiée",
  survey_completed: "VT réalisée",
  quote_pending: "Devis en cours",
  quote_sent: "Devis envoyé",
  quote_signed: "Devis signé",
  installation_scheduled: "Installation planifiée",
  installation_in_progress: "Installation en cours",
  installation_completed: "Installation terminée",
  project_closed: "Clôturé",
  project_cancelled: "Annulé",
  draft: "Brouillon",
  sent: "Envoyé",
  signed: "Signé",
  rejected: "Refusé",
  expired: "Expiré",
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé",
  scheduled: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  reported: "Reporté",
  new: "Nouveau",
  qualified: "Qualifié",
  planned: "Planifié",
  closed: "Fermé",
};

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
