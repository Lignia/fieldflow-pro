import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
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
  Plus,
  ChevronDown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useProjectDetail } from "@/hooks/useProjectDetail";
import { type ProjectStatus } from "@/hooks/useProjects";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── DEV bypass ─────────────────────────────────────────────────────────────
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

// ─── Pipeline progress ──────────────────────────────────────────────────────

const PIPELINE_STEPS: { status: ProjectStatus; short: string }[] = [
  { status: "lead_new", short: "Lead" },
  { status: "lead_qualified", short: "Qualifié" },
  { status: "estimate_sent", short: "Estimatif" },
  { status: "vt_planned", short: "VT" },
  { status: "vt_done", short: "VT faite" },
  { status: "tech_review_done", short: "Étude" },
  { status: "final_quote_sent", short: "Devis final" },
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

// ─── Status transitions ─────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Partial<Record<ProjectStatus, { label: string; next: ProjectStatus }[]>> = {
  lead_new:               [{ label: "Qualifier le lead", next: "lead_qualified" }],
  lead_qualified:         [{ label: "Envoyer estimatif", next: "estimate_sent" }],
  estimate_sent:          [{ label: "Planifier VT", next: "vt_planned" }],
  vt_planned:             [{ label: "VT réalisée", next: "vt_done" }],
  vt_done:                [{ label: "Étude faite", next: "tech_review_done" }],
  tech_review_done:       [{ label: "Envoyer devis final", next: "final_quote_sent" }],
  final_quote_sent:       [{ label: "Signé", next: "signed" }, { label: "Perdu", next: "lost" }],
  signed:                 [{ label: "Acompte reçu", next: "deposit_paid" }],
  deposit_paid:           [{ label: "Commander fournisseur", next: "supplier_ordered" }],
  supplier_ordered:       [{ label: "Matériel reçu", next: "material_received" }],
  material_received:      [{ label: "Planifier pose", next: "installation_scheduled" }],
  installation_scheduled: [{ label: "MES faite", next: "mes_done" }],
  mes_done:               [{ label: "Clôturer", next: "closed" }],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatDateShort(d: string): string {
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

// ─── Activity types ─────────────────────────────────────────────────────────

interface Activity {
  id: string;
  activity_type: string;
  payload: any;
  occurred_at: string;
  actor_name: string | null;
}

const ACTIVITY_LABELS: Record<string, (payload: any) => string> = {
  wf_status_change: (p) => `Statut : ${p?.from ?? "?"} → ${p?.to ?? "?"}`,
  wf_quote_sent: () => "Devis envoyé au client",
  payment_received: () => "Paiement reçu",
};

function activityLabel(a: Activity): string {
  const fn = ACTIVITY_LABELS[a.activity_type];
  return fn ? fn(a.payload) : a.activity_type;
}

const MOCK_ACTIVITIES: Activity[] = [
  { id: "m1", activity_type: "payment_received", payload: {}, occurred_at: new Date(Date.now() - 3 * 86400000).toISOString(), actor_name: "Patrick Lefèvre" },
  { id: "m2", activity_type: "wf_status_change", payload: { from: "final_quote_sent", to: "signed" }, occurred_at: new Date(Date.now() - 5 * 86400000).toISOString(), actor_name: "M. Fabre" },
  { id: "m3", activity_type: "wf_quote_sent", payload: {}, occurred_at: new Date(Date.now() - 8 * 86400000).toISOString(), actor_name: "Patrick Lefèvre" },
];

// ─── Page component ─────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, loading, error, refetch } = useProjectDetail(id);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    if (DEV_BYPASS) {
      setActivities(MOCK_ACTIVITIES);
      return;
    }

    async function fetchActivities() {
      setActivitiesLoading(true);
      try {
        const { data, error: err } = await coreDb
          .from("activities")
          .select(`
            id,
            activity_type,
            payload,
            occurred_at,
            actor:actor_user_id (full_name)
          `)
          .eq("scope_type", "project")
          .eq("scope_id", id)
          .order("occurred_at", { ascending: false })
          .limit(10);

        if (err) throw err;
        setActivities(
          (data ?? []).map((d: any) => ({
            id: d.id,
            activity_type: d.activity_type,
            payload: d.payload,
            occurred_at: d.occurred_at,
            actor_name: d.actor?.full_name ?? null,
          }))
        );
      } catch {
        // silently fail — activities are non-critical
      } finally {
        setActivitiesLoading(false);
      }
    }

    fetchActivities();
  }, [id]);

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
  const transitions = STATUS_TRANSITIONS[project.status] ?? [];

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
              {formatDateShort(project.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Réessayer
              </Button>
            )}
            {transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Changer le statut
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((t) => (
                    <DropdownMenuItem
                      key={t.next}
                      onClick={() => {
                        toast.info(`Transition vers "${t.label}" — RPC non connectée en V1`, {
                          id: "status-transition",
                        });
                      }}
                    >
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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
          <span className="flex-1" />
          <Button size="sm" onClick={() => navigate(`/projects/${project.id}/quotes/new?kind=estimate`)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nouveau devis
          </Button>
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
                    {formatDateShort(q.quote_date)}
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
                    {formatDateShort(inv.invoice_date)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Activity section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Activité</h2>
        </div>
        {activitiesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
          </Card>
        ) : (
          <div className="relative pl-4 border-l-2 border-border space-y-4">
            {activities.map((a) => (
              <div key={a.id} className="relative">
                <div className="absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full bg-muted-foreground/40 border-2 border-background" />
                <p className="text-sm">{activityLabel(a)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.actor_name ?? "Système"} ·{" "}
                  {formatDistanceToNow(new Date(a.occurred_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
