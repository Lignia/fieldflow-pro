import { cn } from "@/lib/utils";

/**
 * StatusBadge — Design System (reconstruit from scratch)
 * Une seule définition par statut. Zéro doublon.
 *
 * Buckets sémantiques :
 *   SECONDARY    → état initial, neutre
 *   INFO         → workflow en cours, étape normale
 *   WARNING      → action requise, attention
 *   SUCCESS      → vraiment terminé / payé
 *   DESTRUCTIVE  → perdu, annulé
 *
 * Note : `canceled` (1 L, billing) = SECONDARY (annulation neutre)
 *        `cancelled` (2 L, core/operations) = DESTRUCTIVE (perte d'activité)
 */

type StatusType =
  | "project"
  | "installation"
  | "survey"
  | "service_request"
  | "intervention"
  | "intervention_type"
  | "quote"
  | "quote_kind"
  | "invoice"
  | "invoice_kind"
  | "payment"
  | "payment_method"
  | "customer_status";

const STATUS_COLORS: Record<string, string> = {
  // ── SECONDARY ─────────────────────────────
  lead_new:          "bg-secondary text-secondary-foreground",
  lead_qualified:    "bg-secondary text-secondary-foreground",
  draft:             "bg-secondary text-secondary-foreground",
  on_hold:           "bg-secondary text-secondary-foreground",
  void:              "bg-secondary text-secondary-foreground",
  canceled:          "bg-secondary text-secondary-foreground",
  superseded:        "bg-secondary text-secondary-foreground",
  prospect:          "bg-secondary text-secondary-foreground",

  // ── INFO ──────────────────────────────────
  vt_planned:             "bg-info/15 text-info",
  vt_done:                "bg-info/15 text-info",
  tech_review_done:       "bg-info/15 text-info",
  estimate_sent:          "bg-info/15 text-info",
  final_quote_sent:       "bg-info/15 text-info",
  sent:                   "bg-info/15 text-info",
  supplier_ordered:       "bg-info/15 text-info",
  material_received:      "bg-info/15 text-info",
  installation_scheduled: "bg-info/15 text-info",
  in_progress:            "bg-info/15 text-info",
  planned:                "bg-info/15 text-info",
  commissioned:           "bg-info/15 text-info",
  scheduled:              "bg-info/15 text-info",
  new:                    "bg-info/15 text-info",
  qualified:              "bg-info/15 text-info",
  technical_survey:       "bg-info/15 text-info",
  signed:                 "bg-info/20 text-info",
  deposit_paid:           "bg-info/20 text-info",

  // ── WARNING ───────────────────────────────
  overdue:           "bg-warning/15 text-warning",
  partial:           "bg-warning/15 text-warning",

  // ── SUCCESS ───────────────────────────────
  mes_done:          "bg-success/15 text-success",
  closed:            "bg-success/15 text-success",
  paid:              "bg-success/15 text-success",
  active:            "bg-success/15 text-success",
  validated:         "bg-success/15 text-success",
  completed:         "bg-success/15 text-success",
  installed:         "bg-success/15 text-success",

  // ── DESTRUCTIVE ───────────────────────────
  lost:              "bg-destructive/10 text-destructive",
  cancelled:         "bg-destructive/10 text-destructive",
  expired:           "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  // SECONDARY
  lead_new: "Nouveau lead",
  lead_qualified: "Lead qualifié",
  draft: "Brouillon",
  on_hold: "En pause",
  void: "Nul",
  canceled: "Annulé",
  superseded: "Remplacé",
  prospect: "Prospect",

  // INFO
  vt_planned: "VT planifiée",
  vt_done: "VT réalisée",
  tech_review_done: "Étude faite",
  estimate_sent: "Estimatif envoyé",
  final_quote_sent: "Devis envoyé",
  sent: "Envoyé",
  supplier_ordered: "Commandé",
  material_received: "Matériel reçu",
  installation_scheduled: "Pose planifiée",
  in_progress: "En cours",
  planned: "Planifié",
  commissioned: "Mis en service",
  scheduled: "Planifié",
  new: "Nouveau",
  qualified: "Qualifié",
  technical_survey: "Visite technique",
  signed: "Signé",
  deposit_paid: "Acompte reçu",

  // WARNING
  overdue: "En retard",
  partial: "Partiel",

  // SUCCESS
  mes_done: "MES réalisée",
  closed: "Clôturé",
  paid: "Payé",
  active: "Actif",
  validated: "Validé",
  completed: "Terminé",
  installed: "Installé",

  // DESTRUCTIVE
  lost: "Perdu",
  cancelled: "Annulé",
  expired: "Expiré",

  // Kinds (non-status) — conservés pour compat
  estimate: "Estimatif",
  final: "Final",
  service: "SAV",
  deposit: "Acompte",
  credit_note: "Avoir",

  // Intervention types
  sweep: "Ramonage",
  annual_service: "Entretien annuel",
  repair: "Réparation",
  diagnostic: "Diagnostic",
  commissioning: "Mise en service",
  installation: "Installation",
  commercial_visit: "Visite commerciale",

  // Payment methods
  card: "Carte",
  bank_transfer: "Virement",
  cash: "Espèces",
  check: "Chèque",
  direct_debit: "Prélèvement",
  other: "Autre",

  // Customer
  archived: "Archivé",

  // Payment status
  pending: "En attente",
  succeeded: "Encaissé",
  failed: "Échoué",
  refunded: "Remboursé",
};

const TYPE_LABEL_OVERRIDES: Partial<Record<StatusType, Record<string, string>>> = {
  customer_status: { active: "Actif", prospect: "Prospect", archived: "Archivé" },
  installation: { draft: "Brouillon", planned: "Planifiée" },
  survey: { draft: "Brouillon", validated: "Validé" },
  invoice: { canceled: "Annulée", void: "Annulée (nul)" },
  invoice_kind: { final: "Solde", service: "Intervention" },
  payment: { pending: "En attente", canceled: "Annulé" },
};

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, type, size = "sm", className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  const overrideLabel = type ? TYPE_LABEL_OVERRIDES[type]?.[status] : undefined;
  const label = overrideLabel ?? STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" && "px-2.5 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

export type { StatusType, StatusBadgeProps };