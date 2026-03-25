import { cn } from "@/lib/utils";

/**
 * StatusBadge — Design System P0
 * Couvre les 55 valeurs d'enums SQL exactes du schéma LIGNIA V1.
 *
 * Conventions :
 *   - Clés = valeurs SQL littérales (ex: "vt_planned", "canceled" 1 L)
 *   - Couleurs = tokens sémantiques Tailwind (accent, info, warning, destructive, muted)
 *   - Labels = français métier
 *   - `type` permet de désambiguïser les clés partagées entre domaines
 *     (ex: "draft" existe dans quote, invoice, installation, survey)
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
  | "payment_method";

// ─── Couleurs par clé ────────────────────────────────────────────────────────
// Groupement sémantique :
//   info (bleu)      → planifié, envoyé, nouveau, en attente
//   accent (vert)    → signé, payé, actif, complété, validé
//   warning (ambre)  → en cours, qualifié, partiel, expiré
//   destructive      → annulé, perdu, en retard, non conforme, void
//   muted            → brouillon, clôturé, archivé, superseded

const STATUS_COLORS: Record<string, string> = {
  // ── core.project_status (17) ──────────────────────────────────────────────
  lead_new:                "bg-info/15 text-info",
  lead_qualified:          "bg-info/20 text-info",
  vt_planned:              "bg-info/15 text-info",
  vt_done:                 "bg-warning/15 text-warning",
  tech_review_done:        "bg-warning/20 text-warning",
  estimate_sent:           "bg-info/15 text-info",
  final_quote_sent:        "bg-info/20 text-info",
  signed:                  "bg-accent/15 text-accent",
  deposit_paid:            "bg-accent/20 text-accent",
  supplier_ordered:        "bg-warning/15 text-warning",
  material_received:       "bg-warning/20 text-warning",
  installation_scheduled:  "bg-accent/15 text-accent",
  mes_done:                "bg-accent/20 text-accent",
  closed:                  "bg-muted text-muted-foreground",
  on_hold:                 "bg-warning/15 text-warning",
  lost:                    "bg-destructive/10 text-destructive",
  cancelled:               "bg-destructive/10 text-destructive", // alias FR (pages existantes)

  // ── core.installation_status (5) ──────────────────────────────────────────
  // "draft" → traité en fallback par type
  planned:                 "bg-info/15 text-info",
  installed:               "bg-accent/15 text-accent",
  commissioned:            "bg-accent/20 text-accent",
  active:                  "bg-accent/15 text-accent",

  // ── core.survey_status (3) ────────────────────────────────────────────────
  validated:               "bg-accent/15 text-accent",
  superseded:              "bg-muted text-muted-foreground",

  // ── operations.service_request_status (6) ─────────────────────────────────
  new:                     "bg-info/15 text-info",
  qualified:               "bg-warning/15 text-warning",
  scheduled:               "bg-info/15 text-info",
  in_progress:             "bg-warning/20 text-warning",
  // "closed" → déjà défini
  // "cancelled" → déjà défini

  // ── operations.intervention_status (5) ────────────────────────────────────
  // "planned", "scheduled", "in_progress" → déjà définis
  completed:               "bg-accent/20 text-accent",
  // "cancelled" → déjà défini

  // ── operations.intervention_type (8) ──────────────────────────────────────
  sweep:                   "bg-info/15 text-info",
  annual_service:          "bg-info/15 text-info",
  repair:                  "bg-destructive/10 text-destructive",
  diagnostic:              "bg-warning/15 text-warning",
  commissioning:           "bg-accent/15 text-accent",
  installation:            "bg-accent/15 text-accent",
  commercial_visit:        "bg-info/15 text-info",
  technical_survey:        "bg-warning/15 text-warning",

  // ── billing.quote_status (6) ──────────────────────────────────────────────
  draft:                   "bg-muted text-muted-foreground",
  sent:                    "bg-info/15 text-info",
  // "signed" → déjà défini
  // "lost" → déjà défini
  expired:                 "bg-warning/15 text-warning",
  canceled:                "bg-destructive/10 text-destructive", // SQL : 1 L

  // ── billing.invoice_status (7) ────────────────────────────────────────────
  // "draft", "sent" → déjà définis
  paid:                    "bg-accent/15 text-accent",
  partial:                 "bg-warning/15 text-warning",
  overdue:                 "bg-destructive/10 text-destructive",
  // "canceled" → déjà défini
  void:                    "bg-destructive/10 text-destructive",

  // ── billing.payment_status (5) ────────────────────────────────────────────
  pending:                 "bg-warning/15 text-warning",
  succeeded:               "bg-accent/15 text-accent",
  failed:                  "bg-destructive/10 text-destructive",
  refunded:                "bg-warning/15 text-warning",
  // "canceled" → déjà défini

  // ── billing.quote_kind (3) ────────────────────────────────────────────────
  estimate:                "bg-info/15 text-info",
  final:                   "bg-accent/15 text-accent",
  service:                 "bg-warning/15 text-warning",

  // ── billing.invoice_kind (4) ──────────────────────────────────────────────
  deposit:                 "bg-info/15 text-info",
  // "final", "service" → déjà définis
  credit_note:             "bg-destructive/10 text-destructive",

  // ── billing.payment_method (6) ────────────────────────────────────────────
  card:                    "bg-info/15 text-info",
  bank_transfer:           "bg-info/15 text-info",
  cash:                    "bg-accent/15 text-accent",
  check:                   "bg-info/15 text-info",
  direct_debit:            "bg-info/15 text-info",
  other:                   "bg-muted text-muted-foreground",
};

// ─── Labels FR par clé ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  // ── core.project_status (17) ──────────────────────────────────────────────
  lead_new:                "Nouveau lead",
  lead_qualified:          "Lead qualifié",
  vt_planned:              "VT planifiée",
  vt_done:                 "VT réalisée",
  tech_review_done:        "Étude faite",
  estimate_sent:           "Estimatif envoyé",
  final_quote_sent:        "Devis envoyé",
  signed:                  "Signé",
  deposit_paid:            "Acompte reçu",
  supplier_ordered:        "Commandé",
  material_received:       "Matériel reçu",
  installation_scheduled:  "Pose planifiée",
  mes_done:                "MES réalisée",
  closed:                  "Clôturé",
  on_hold:                 "En pause",
  lost:                    "Perdu",
  cancelled:               "Annulé",

  // ── core.installation_status (5) ──────────────────────────────────────────
  // "draft" → label par défaut ci-dessous
  planned:                 "Planifié",
  installed:               "Installé",
  commissioned:            "Mis en service",
  active:                  "Actif",

  // ── core.survey_status (3) ────────────────────────────────────────────────
  validated:               "Validé",
  superseded:              "Remplacé",

  // ── operations.service_request_status (6) ─────────────────────────────────
  new:                     "Nouveau",
  qualified:               "Qualifié",
  scheduled:               "Planifié",
  in_progress:             "En cours",
  // "closed" → "Clôturé"
  // "cancelled" → "Annulé"

  // ── operations.intervention_status (5) ────────────────────────────────────
  // "planned" → "Planifié"
  // "scheduled" → "Planifié"
  // "in_progress" → "En cours"
  completed:               "Terminé",
  // "cancelled" → "Annulé"

  // ── operations.intervention_type (8) ──────────────────────────────────────
  sweep:                   "Ramonage",
  annual_service:          "Entretien annuel",
  repair:                  "Réparation",
  diagnostic:              "Diagnostic",
  commissioning:           "Mise en service",
  installation:            "Installation",
  commercial_visit:        "Visite commerciale",
  technical_survey:        "Visite technique",

  // ── billing.quote_status (6) ──────────────────────────────────────────────
  draft:                   "Brouillon",
  sent:                    "Envoyé",
  // "signed" → "Signé"
  // "lost" → "Perdu"
  expired:                 "Expiré",
  canceled:                "Annulé",

  // ── billing.invoice_status (7) ────────────────────────────────────────────
  // "draft" → "Brouillon", "sent" → "Envoyé"
  paid:                    "Payé",
  partial:                 "Partiel",
  overdue:                 "En retard",
  // "canceled" → "Annulé"
  void:                    "Nul",

  // ── billing.payment_status (5) ────────────────────────────────────────────
  pending:                 "En attente",
  succeeded:               "Encaissé",
  failed:                  "Échoué",
  refunded:                "Remboursé",
  // "canceled" → "Annulé"

  // ── billing.quote_kind (3) ────────────────────────────────────────────────
  estimate:                "Estimatif",
  final:                   "Définitif",
  service:                 "SAV",

  // ── billing.invoice_kind (4) ──────────────────────────────────────────────
  deposit:                 "Acompte",
  // "final" → "Définitif", "service" → "SAV"
  credit_note:             "Avoir",

  // ── billing.payment_method (6) ────────────────────────────────────────────
  card:                    "Carte",
  bank_transfer:           "Virement",
  cash:                    "Espèces",
  check:                   "Chèque",
  direct_debit:            "Prélèvement",
  other:                   "Autre",
};

// ─── Overrides par type (désambiguïsation) ──────────────────────────────────
// Quand un même status key a un sens différent selon le domaine,
// on peut forcer un label/couleur spécifique via le prop `type`.

const TYPE_LABEL_OVERRIDES: Partial<Record<StatusType, Record<string, string>>> = {
  installation: {
    draft: "Brouillon",
    planned: "Planifiée",
  },
  survey: {
    draft: "Brouillon",
    validated: "Validé",
  },
  invoice: {
    canceled: "Annulée",
    void: "Annulée (nul)",
  },
  invoice_kind: {
    final: "Solde",
    service: "Intervention",
  },
  payment: {
    pending: "En attente",
    canceled: "Annulé",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, type, size = "sm", className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";

  // Label : override par type > label global > clé brute
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

// ─── Export des types pour usage externe ─────────────────────────────────────
export type { StatusType, StatusBadgeProps };
