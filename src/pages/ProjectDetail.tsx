import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
  Clock,
  Calendar,
  ClipboardList,
  Hammer,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useProjectDetail } from "@/hooks/useProjectDetail";
import { type ProjectStatus } from "@/hooks/useProjects";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

// ─── Pipeline (4 phases) ────────────────────────────────────────────────────

type Phase = "commercial" | "terrain" | "signature" | "livraison";

const PIPELINE_STEPS: { status: ProjectStatus; label: string; phase: Phase }[] = [
  { status: "lead_new", label: "Lead entrant", phase: "commercial" },
  { status: "lead_qualified", label: "Lead qualifié", phase: "commercial" },
  { status: "estimate_sent", label: "Estimatif envoyé", phase: "commercial" },
  { status: "vt_planned", label: "Visite technique planifiée", phase: "terrain" },
  { status: "vt_done", label: "Visite technique réalisée", phase: "terrain" },
  { status: "tech_review_done", label: "Étude technique validée", phase: "terrain" },
  { status: "final_quote_sent", label: "Devis final envoyé", phase: "signature" },
  { status: "signed", label: "Devis signé", phase: "signature" },
  { status: "deposit_paid", label: "Acompte reçu", phase: "signature" },
  { status: "supplier_ordered", label: "Commande fournisseur", phase: "livraison" },
  { status: "material_received", label: "Matériel reçu", phase: "livraison" },
  { status: "installation_scheduled", label: "Pose planifiée", phase: "livraison" },
  { status: "mes_done", label: "Mise en service faite", phase: "livraison" },
  { status: "closed", label: "Dossier clôturé", phase: "livraison" },
];

const PHASES: { key: Phase; label: string }[] = [
  { key: "commercial", label: "Commercial" },
  { key: "terrain", label: "Terrain" },
  { key: "signature", label: "Signature" },
  { key: "livraison", label: "Livraison" },
];

function getStepIndex(status: ProjectStatus): number {
  return PIPELINE_STEPS.findIndex((s) => s.status === status);
}

function PipelineProgress({ status }: { status: ProjectStatus }) {
  const isTerminal = status === "lost" || status === "cancelled" || status === "on_hold";
  if (isTerminal) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={status} type="project" size="md" />
      </div>
    );
  }

  const currentIdx = getStepIndex(status);
  const current = PIPELINE_STEPS[currentIdx];
  const currentPhase = current?.phase;
  const phaseOrder = PHASES.map((p) => p.key);
  const currentPhaseIdx = phaseOrder.indexOf(currentPhase);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {PHASES.map((phase, i) => {
          const isPast = i < currentPhaseIdx;
          const isCurrent = i === currentPhaseIdx;
          return (
            <div key={phase.key} className="flex-1 flex items-center gap-1.5">
              <div className="flex-1 space-y-1.5">
                <div
                  className={cn(
                    "h-2 rounded-full transition-colors",
                    isPast && "bg-accent",
                    isCurrent && "bg-accent ring-2 ring-accent/30",
                    !isPast && !isCurrent && "bg-muted",
                  )}
                />
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-wider text-center font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {phase.label}
                </p>
              </div>
              {i < PHASES.length - 1 && (
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0 mt-[-14px]",
                    isPast ? "bg-accent" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        <span className="font-mono">Étape {currentIdx + 1}/14</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{current?.label ?? status}</span>
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatDateShort(d: string): string {
  return format(new Date(d), "d MMM yyyy", { locale: fr });
}

const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manuel", phone: "Téléphone", web: "Web", referral: "Parrainage",
  api: "API", showroom: "Showroom", fair: "Salon", partner: "Partenaire",
};

// ─── Qualification labels ───────────────────────────────────────────────────

const PROJECT_TYPE_LABELS: Record<string, string> = {
  installation_neuve: "Installation neuve",
  remplacement: "Remplacement",
  renovation: "Rénovation",
};

const ENERGY_LABELS: Record<string, string> = {
  wood: "🪵 Bois",
  pellet: "🟤 Granulés",
  unknown: "❓ Inconnu",
};

const USAGE_LABELS: Record<string, string> = {
  main: "Principal",
  secondary: "Appoint",
  comfort: "Confort",
};

const HOUSING_LABELS: Record<string, string> = {
  house: "🏠 Maison",
  apartment: "🏢 Appartement",
};

const HEATING_LABELS: Record<string, string> = {
  electric: "Électrique",
  gas: "Gaz",
  oil: "Fioul",
  other: "Autre",
};

const BUDGET_LABELS: Record<string, string> = {
  lt_5k: "< 5 000 €",
  "5k_10k": "5 000 – 10 000 €",
  gt_10k: "> 10 000 €",
  unknown: "Non défini",
};

const HORIZON_LABELS: Record<string, string> = {
  urgent: "< 1 mois",
  lt_3months: "1 à 3 mois",
  gt_3months: "+ 3 mois",
};

function flueScenarioClass(scenario: string): string {
  if (!scenario) return "bg-muted text-muted-foreground";
  const first = scenario.trim().charAt(0);
  if (first === "🟢") return "bg-success/10 text-success border-success/30";
  if (first === "🟡") return "bg-warning/10 text-warning border-warning/30";
  if (first === "🟠" || first === "🔴") return "bg-destructive/10 text-destructive border-destructive/30";
  if (first === "⚪") return "bg-muted text-muted-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
}

function QualificationCard({ payload }: { payload: Record<string, any> }) {
  if (!payload || !payload.project_type) return null;

  const projectType = PROJECT_TYPE_LABELS[payload.project_type] ?? payload.project_type;
  const energy = payload.energy_type ? (ENERGY_LABELS[payload.energy_type] ?? payload.energy_type) : null;
  const usage = payload.usage_type ? (USAGE_LABELS[payload.usage_type] ?? payload.usage_type) : null;
  const housing = payload.housing_type ? (HOUSING_LABELS[payload.housing_type] ?? payload.housing_type) : null;
  const surface = payload.surface_m2 ? `${payload.surface_m2} m²` : null;
  const power = payload.estimated_power_kw ? `~${payload.estimated_power_kw} kW indicatif` : null;
  const heating = payload.current_heating ? (HEATING_LABELS[payload.current_heating] ?? payload.current_heating) : null;
  const flueScenario: string | null = payload.flue_scenario ?? null;
  const budget = payload.budget ? (BUDGET_LABELS[payload.budget] ?? payload.budget) : null;
  const horizon = payload.horizon ? (HORIZON_LABELS[payload.horizon] ?? payload.horizon) : null;
  const reliability: string | null = payload.reliability_badge ?? null;
  const score: number | null = typeof payload.qualification_score === "number" ? payload.qualification_score : null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Qualification</h2>
        </div>
        {reliability && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            flueScenarioClass(reliability),
          )}>
            {reliability}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Col 1 — Projet */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Projet</p>
          <p className="text-sm font-medium">{projectType}</p>
          {energy && <p className="text-xs text-muted-foreground">{energy}</p>}
          {usage && <p className="text-xs text-muted-foreground">Usage : {usage}</p>}
        </div>

        {/* Col 2 — Logement */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Logement</p>
          {housing && <p className="text-sm font-medium">{housing}</p>}
          {surface && <p className="text-xs text-muted-foreground font-mono">{surface}</p>}
          {power && <p className="text-xs text-muted-foreground font-mono">{power}</p>}
          {heating && <p className="text-xs text-muted-foreground">Chauffage : {heating}</p>}
        </div>

        {/* Col 3 — Fumisterie */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Fumisterie</p>
          {flueScenario ? (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
              flueScenarioClass(flueScenario),
            )}>
              {flueScenario}
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
          {budget && <p className="text-xs text-muted-foreground">Budget : {budget}</p>}
          {horizon && <p className="text-xs text-muted-foreground">Délai : {horizon}</p>}
        </div>
      </div>

      {score !== null && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Score qualification : <span className="font-mono font-medium text-foreground">{score}/5</span>
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── Activities ─────────────────────────────────────────────────────────────

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

// ─── Back navigation helper ─────────────────────────────────────────────────

function useHandleBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key !== "default") navigate(-1);
    else navigate(fallback);
  };
}

// ─── Page component ─────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handleBack = useHandleBack("/projects");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "general";

  const { project, loading, error, refetch } = useProjectDetail(id);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const { coreUser } = useCurrentUser();
  const [transitioning, setTransitioning] = useState(false);

  async function transitionStatus(next: ProjectStatus, label: string) {
    if (!project) return;
    if (!coreUser) {
      toast.error("Session non chargée, réessayez.");
      return;
    }
    setTransitioning(true);
    try {
      const { error: rpcErr } = await coreDb.rpc("transition_project_status", {
        p_project_id: project.id,
        p_new_status: next,
        p_actor_id: coreUser.id,
      });
      if (rpcErr) {
        toast.error(rpcErr.message);
        return;
      }
      toast.success(`Statut mis à jour : ${label}`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors du changement de statut");
    } finally {
      setTransitioning(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    if (DEV_BYPASS) { setActivities(MOCK_ACTIVITIES); return; }

    async function fetchActivities() {
      setActivitiesLoading(true);
      try {
        const { data, error: err } = await coreDb
          .from("activities")
          .select(`id, activity_type, payload, occurred_at, actor:actor_user_id (full_name)`)
          .eq("scope_type", "project")
          .eq("scope_id", id)
          .order("occurred_at", { ascending: false })
          .limit(10);
        if (err) throw err;
        setActivities(
          (data ?? []).map((d: any) => ({
            id: d.id, activity_type: d.activity_type, payload: d.payload,
            occurred_at: d.occurred_at, actor_name: d.actor?.full_name ?? null,
          }))
        );
      } catch { /* non-critical */ } finally { setActivitiesLoading(false); }
    }
    fetchActivities();
  }, [id]);

  if (error && !loading) toast.error(error, { id: "project-detail-error" });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux projets
        </Button>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Projet introuvable</p>
        </Card>
      </div>
    );
  }

  const { customer, property, quotes, invoices, payload } = project;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Projets
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.project_number}</h1>
              <StatusBadge status={project.status} type="project" size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {customer.name} · {ORIGIN_LABELS[project.origin] ?? project.origin} · Créé le {formatDateShort(project.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Réessayer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="commercial">
            Devis &amp; Factures {(quotes.length + invoices.length) > 0 && `(${quotes.length + invoices.length})`}
          </TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* ── Vue d'ensemble ── */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <ActionRecommendedCard
            project={project}
            transitioning={transitioning}
            onTransition={transitionStatus}
            onNavigate={navigate}
          />

          <Card className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">Cycle de vente</p>
            <PipelineProgress status={project.status} />
          </Card>

          <QualificationCard payload={payload} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Client</h2>
                <CustomerBadge customerType={customer.customer_type as any} size="sm" />
              </div>
              <Button variant="link" className="p-0 h-auto font-medium text-sm" onClick={() => navigate(`/clients/${customer.id}`)}>
                {customer.name}
              </Button>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {customer.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{customer.email}</div>}
                {customer.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{customer.phone}</div>}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Bien</h2>
                {property.property_type && <span className="text-xs text-muted-foreground capitalize">{property.property_type}</span>}
              </div>
              {property.label && <p className="font-medium text-sm mb-1">{property.label}</p>}
              <p className="text-sm text-muted-foreground">{property.address_line1}</p>
              {property.address_line2 && <p className="text-sm text-muted-foreground">{property.address_line2}</p>}
              <p className="text-sm text-muted-foreground">{property.postal_code} {property.city}</p>
            </Card>
          </div>
        </TabsContent>

        {/* ── Devis & Factures ── */}
        <TabsContent value="commercial" className="space-y-6 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Devis ({quotes.length})
              </h2>
              {(() => {
                const s = project.status;
                if (s === "lead_new" || s === "lead_qualified") {
                  return (
                    <Button size="sm" onClick={() => navigate(`/projects/${project.id}/quotes/new?kind=estimate`)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Créer le devis estimatif
                    </Button>
                  );
                }
                if (s === "estimate_sent" || s === "vt_planned" || s === "vt_done" || s === "tech_review_done") {
                  return (
                    <Button size="sm" onClick={() => navigate(`/projects/${project.id}/quotes/new?kind=final`)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Créer le devis final
                    </Button>
                  );
                }
                return null;
              })()}
            </div>
            {quotes.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Aucun devis lié à ce projet</p>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {quotes.map((q) => (
                  <Card key={q.id} className="p-3.5 cursor-pointer hover:border-accent/20 transition-colors" onClick={() => navigate(`/quotes/${q.id}`)}>
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{q.quote_number}</span>
                      <StatusBadge status={q.quote_kind} type="quote_kind" size="sm" />
                      <StatusBadge status={q.quote_status} type="quote" size="sm" />
                      <span className="flex-1" />
                      <span className="font-mono text-sm font-semibold shrink-0">{formatCurrency(q.total_ttc)}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateShort(q.quote_date)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Factures ({invoices.length})
            </h2>
            {invoices.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Aucune facture liée à ce projet</p>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {invoices.map((inv) => (
                  <Card key={inv.id} className="p-3.5 cursor-pointer hover:border-accent/20 transition-colors" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{inv.invoice_number}</span>
                      <StatusBadge status={inv.invoice_kind} type="invoice_kind" size="sm" />
                      <StatusBadge status={inv.invoice_status} type="invoice" size="sm" />
                      <span className="flex-1" />
                      <span className="font-mono text-sm font-semibold shrink-0">{formatCurrency(inv.total_ttc)}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateShort(inv.invoice_date)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Interventions ── */}
        <TabsContent value="interventions" className="space-y-6 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Interventions</h2>
              <div className="flex gap-2 flex-wrap justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate(`/planning?project=${id}`)}>
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Voir dans le planning
                </Button>
                {(project.status === "estimate_sent" || project.status === "vt_planned") && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/interventions/new?type=technical_survey&project_id=${project.id}`)}
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1" /> Planifier la visite technique
                  </Button>
                )}
                {(project.status === "installation_scheduled" ||
                  project.status === "material_received" ||
                  project.status === "deposit_paid" ||
                  project.status === "supplier_ordered") && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/interventions/new?type=installation&project_id=${project.id}`)}
                  >
                    <Hammer className="h-3.5 w-3.5 mr-1" /> Planifier la pose
                  </Button>
                )}
                {project.status === "mes_done" && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/interventions/new?type=commissioning&project_id=${project.id}`)}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" /> Planifier la mise en service
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/interventions/new?project_id=${project.id}`)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Autre intervention
                </Button>
              </div>
            </div>
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucune intervention liée à ce projet</p>
            </Card>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Relevé technique
            </h2>
            <Card className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Aucun relevé technique enregistré</p>
              <Button size="sm" onClick={() => navigate(`/technical-surveys/new?project=${id}`)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Créer le relevé technique
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* ── Historique ── */}
        <TabsContent value="historique" className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Historique</h2>
          </div>
          {activitiesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                    {a.actor_name ?? "Système"} · {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Action Recommended Card ────────────────────────────────────────────────

interface ActionRecommendedCardProps {
  project: ReturnType<typeof useProjectDetail>["project"];
  transitioning: boolean;
  onTransition: (next: ProjectStatus, label: string) => void;
  onNavigate: (path: string) => void;
}

function ActionRecommendedCard({ project, transitioning, onTransition, onNavigate }: ActionRecommendedCardProps) {
  if (!project) return null;
  const status = project.status;

  // Pas de Card pour statuts terminaux
  if (status === "closed" || status === "lost" || status === "cancelled" || status === "on_hold") {
    return null;
  }

  const { quotes, invoices } = project;
  const hasSignedFinalQuote = quotes.some((q) => q.quote_kind === "final" && q.quote_status === "signed");
  const hasDepositInvoice = invoices.some((i) => i.invoice_kind === "deposit");
  const firstDepositInvoice = invoices.find((i) => i.invoice_kind === "deposit");

  const renderContent = () => {
    switch (status) {
      case "lead_new":
        return {
          title: "Étape suivante : qualifier ce lead",
          actions: (
            <Button
              size="sm"
              disabled={transitioning}
              onClick={() => onTransition("lead_qualified", "Lead qualifié")}
            >
              Qualifier <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ),
        };

      case "lead_qualified":
        return {
          title: "Étape suivante : créer le devis estimatif",
          actions: (
            <Button
              size="sm"
              onClick={() => onNavigate(`/projects/${project.id}/quotes/new?kind=estimate`)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Créer le devis estimatif
            </Button>
          ),
          note: "Le statut passera à « Estimatif envoyé » après envoi du devis.",
        };

      case "estimate_sent":
        return {
          title: "Étape suivante : planifier la visite technique",
          actions: (
            <>
              <Button
                size="sm"
                onClick={() => onNavigate(`/interventions/new?type=technical_survey&project_id=${project.id}`)}
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1" /> Planifier la VT
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={transitioning}
                onClick={() => onTransition("vt_planned", "VT planifiée")}
              >
                VT planifiée <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          ),
        };

      case "vt_planned":
        return {
          title: "Visite technique planifiée",
          actions: (
            <Button
              size="sm"
              disabled={transitioning}
              onClick={() => onTransition("vt_done", "VT réalisée")}
            >
              Marquer la VT réalisée <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ),
        };

      case "vt_done":
        return {
          title: "Étape suivante : créer le relevé technique",
          actions: (
            <>
              <Button
                size="sm"
                onClick={() => onNavigate(`/technical-surveys/new?project=${project.id}`)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Créer le relevé technique
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={transitioning}
                onClick={() => onTransition("tech_review_done", "Étude validée")}
              >
                Étude validée <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          ),
        };

      case "tech_review_done":
        return {
          title: "Étape suivante : créer le devis final",
          actions: (
            <Button
              size="sm"
              onClick={() => onNavigate(`/projects/${project.id}/quotes/new?kind=final`)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Créer le devis final
            </Button>
          ),
        };

      case "final_quote_sent":
        return {
          title: "En attente de signature client",
          actions: hasSignedFinalQuote ? (
            <Button
              size="sm"
              disabled={transitioning}
              onClick={() => onTransition("signed", "Devis signé")}
            >
              Marquer comme signé <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" disabled>
              En attente de signature
            </Button>
          ),
          note: hasSignedFinalQuote
            ? undefined
            : "Signez d'abord le devis final depuis l'onglet Devis & Factures.",
        };

      case "signed":
        return {
          title: "Devis signé ✓",
          actions: hasDepositInvoice ? (
            <>
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Facture acompte créée
              </span>
              <Button
                size="sm"
                disabled={transitioning}
                onClick={() => onTransition("deposit_paid", "Acompte reçu")}
              >
                Acompte reçu <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => firstDepositInvoice && onNavigate(`/invoices/${firstDepositInvoice.id}`)}
              disabled={!firstDepositInvoice}
            >
              <Receipt className="h-3.5 w-3.5 mr-1" /> Voir la facture acompte
            </Button>
          ),
        };

      case "deposit_paid":
        return {
          title: "Acompte reçu ✓",
          actions: (
            <Button
              size="sm"
              disabled={transitioning}
              onClick={() => onTransition("supplier_ordered", "Commande passée")}
            >
              Commande fournisseur passée <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ),
        };

      case "supplier_ordered":
        return {
          title: "Commande passée ✓",
          actions: (
            <Button
              size="sm"
              disabled={transitioning}
              onClick={() => onTransition("material_received", "Matériel reçu")}
            >
              Matériel reçu <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ),
        };

      case "material_received":
        return {
          title: "Étape suivante : planifier la pose",
          actions: (
            <>
              <Button
                size="sm"
                onClick={() => onNavigate(`/interventions/new?type=installation&project_id=${project.id}`)}
              >
                <Hammer className="h-3.5 w-3.5 mr-1" /> Planifier la pose
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={transitioning}
                onClick={() => onTransition("installation_scheduled", "Pose planifiée")}
              >
                Pose planifiée <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          ),
        };

      case "installation_scheduled":
        return {
          title: "Pose planifiée ✓",
          actions: (
            <>
              <Button
                size="sm"
                onClick={() => onNavigate(`/interventions/new?type=commissioning&project_id=${project.id}`)}
              >
                <Zap className="h-3.5 w-3.5 mr-1" /> Planifier la mise en service
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={transitioning}
                onClick={() => onTransition("mes_done", "MES réalisée")}
              >
                MES réalisée <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          ),
        };

      case "mes_done":
        return {
          title: "Mise en service réalisée ✓",
          actions: (
            <Button
              size="sm"
              disabled={transitioning}
              onClick={() => onTransition("closed", "Dossier clôturé")}
            >
              Clôturer le dossier <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ),
        };

      default:
        return null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <Card className="p-4 sm:p-5 border-accent/40 bg-accent/5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">
            Action recommandée
          </p>
          <h2 className="text-sm font-semibold">{content.title}</h2>
          {content.note && (
            <p className="text-xs text-muted-foreground mt-1">{content.note}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {content.actions}
        </div>
      </div>
    </Card>
  );
}
