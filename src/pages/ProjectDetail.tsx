import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  User,
  MapPin,
  Mail,
  Phone,
  FileText,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useProjectDetail } from "@/hooks/useProjectDetail";
import { ALL_PROJECT_STATUSES, type ProjectStatus } from "@/hooks/useProjects";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Pipeline progress ──────────────────────────────────────────────────────

/** Main pipeline statuses displayed in the progress bar (excluding terminal states) */
const PIPELINE_STEPS: { status: ProjectStatus; short: string }[] = [
  { status: "lead_new", short: "Lead" },
  { status: "lead_qualified", short: "Qualifié" },
  { status: "vt_planned", short: "VT" },
  { status: "vt_done", short: "VT faite" },
  { status: "tech_review_done", short: "Étude" },
  { status: "estimate_sent", short: "Estimatif" },
  { status: "final_quote_sent", short: "Devis" },
  { status: "signed", short: "Signé" },
  { status: "deposit_paid", short: "Acompte" },
  { status: "supplier_ordered", short: "Commande" },
  { status: "material_received", short: "Matériel" },
  { status: "installation_scheduled", short: "Pose" },
  { status: "mes_done", short: "MES" },
  { status: "closed", short: "Clôturé" },
];

function getStepIndex(status: ProjectStatus): number {
  const idx = PIPELINE_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : -1;
}

function PipelineProgress({ status }: { status: ProjectStatus }) {
  const currentIdx = getStepIndex(status);
  const isTerminal = status === "lost" || status === "cancelled" || status === "on_hold";

  return (
    <div className="space-y-2">
      {isTerminal && (
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={status} type="project" size="md" />
        </div>
      )}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {PIPELINE_STEPS.map((step, i) => {
          const isDone = !isTerminal && i <= currentIdx;
          const isCurrent = !isTerminal && i === currentIdx;

          return (
            <div key={step.status} className="flex items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-0.5 w-3 sm:w-5",
                    isDone ? "bg-accent" : "bg-border"
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full border-2 shrink-0",
                    isDone && !isCurrent && "bg-accent border-accent",
                    isCurrent && "bg-accent border-accent ring-2 ring-accent/30",
                    !isDone && "bg-background border-border"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] leading-tight text-center whitespace-nowrap",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.short}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatDate(d: string): string {
  return format(new Date(d), "d MMM yyyy", { locale: fr });
}

const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manuel",
  phone: "Téléphone",
  web: "Web",
  referral: "Parrainage",
  api: "API",
  showroom: "Showroom",
  fair: "Salon",
  partner: "Partenaire",
};

// ─── Page component ─────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, loading, error, refetch } = useProjectDetail(id);

  if (error && !loading) {
    toast.error(error, { id: "project-detail-error" });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux projets
        </Button>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Projet introuvable</p>
        </Card>
      </div>
    );
  }

  const { customer, property, quotes, invoices } = project;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Projets
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.project_number}
              </h1>
              <StatusBadge status={project.status} type="project" size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {customer.name} · {ORIGIN_LABELS[project.origin] ?? project.origin} · Créé le{" "}
              {formatDate(project.created_at)}
            </p>
          </div>
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Réessayer
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline progress bar */}
      <Card className="p-4 sm:p-5">
        <p className="text-xs font-medium text-muted-foreground mb-3">Cycle de vente</p>
        <PipelineProgress status={project.status} />
      </Card>

      {/* Client + Property */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client card */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Client</h2>
            <CustomerBadge customerType={customer.customer_type as any} size="sm" />
          </div>
          <p className="font-medium text-sm">{customer.name}</p>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {customer.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {customer.email}
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </div>
            )}
          </div>
        </Card>

        {/* Property card */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Bien</h2>
            {property.property_type && (
              <span className="text-xs text-muted-foreground capitalize">
                {property.property_type}
              </span>
            )}
          </div>
          {property.label && (
            <p className="font-medium text-sm mb-1">{property.label}</p>
          )}
          <p className="text-sm text-muted-foreground">{property.address_line1}</p>
          {property.address_line2 && (
            <p className="text-sm text-muted-foreground">{property.address_line2}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {property.postal_code} {property.city}
          </p>
        </Card>
      </div>

      {/* Quotes section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">
            Devis ({quotes.length})
          </h2>
        </div>
        {quotes.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucun devis lié à ce projet</p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {quotes.map((q) => (
              <Card
                key={q.id}
                className="p-3.5 cursor-pointer hover:border-accent/20 transition-colors"
                onClick={() => navigate(`/quotes/${q.id}`)}
              >
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {q.quote_number}
                  </span>
                  <StatusBadge status={q.quote_kind} type="quote_kind" size="sm" />
                  <StatusBadge status={q.quote_status} type="quote" size="sm" />
                  <span className="flex-1" />
                  <span className="font-mono text-sm font-semibold shrink-0">
                    {formatCurrency(q.total_ttc)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(q.quote_date)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invoices section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">
            Factures ({invoices.length})
          </h2>
        </div>
        {invoices.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucune facture liée à ce projet</p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {invoices.map((inv) => (
              <Card
                key={inv.id}
                className="p-3.5 cursor-pointer hover:border-accent/20 transition-colors"
                onClick={() => navigate(`/invoices/${inv.id}`)}
              >
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {inv.invoice_number}
                  </span>
                  <StatusBadge status={inv.invoice_kind} type="invoice_kind" size="sm" />
                  <StatusBadge status={inv.invoice_status} type="invoice" size="sm" />
                  <span className="flex-1" />
                  <span className="font-mono text-sm font-semibold shrink-0">
                    {formatCurrency(inv.total_ttc)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(inv.invoice_date)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
