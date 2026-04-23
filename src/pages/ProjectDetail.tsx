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
  ChevronDown,
  Clock,
  Calendar,
  FolderKanban,
  ClipboardList,
  Hammer,
  Zap,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  return PIPELINE_STEPS.findIndex((s) => s.status === status);
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
                <div className={cn("h-0.5 w-3 sm:w-5", isDone ? "bg-accent" : "bg-border")} />
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
  manual: "Manuel", phone: "Téléphone", web: "Web", referral: "Parrainage",
  api: "API", showroom: "Showroom", fair: "Salon", partner: "Partenaire",
};

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
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(fallback);
    }
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

  const { customer, property, quotes, invoices } = project;
  const transitions = STATUS_TRANSITIONS[project.status] ?? [];

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
            {transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={transitioning}>
                    Changer le statut <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((t) => (
                    <DropdownMenuItem
                      key={t.next}
                      onClick={() => transitionStatus(t.next, t.label)}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="devis">
            Devis {quotes.length > 0 && `(${quotes.length})`}
          </TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="releve">Relevé technique</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* ── Général ── */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">Cycle de vente</p>
            <PipelineProgress status={project.status} />
          </Card>

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

        {/* ── Devis ── */}
        <TabsContent value="devis" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Devis ({quotes.length})
            </h2>
            <Button size="sm" onClick={() => navigate(`/projects/${project.id}/quotes/new?kind=estimate`)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nouveau devis
            </Button>
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
        </TabsContent>

        {/* ── Interventions ── */}
        <TabsContent value="interventions" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Interventions</h2>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate(`/planning?project=${id}`)}>
                <Calendar className="h-3.5 w-3.5 mr-1" /> Voir dans le planning
              </Button>
              {(project.status === "estimate_sent" || project.status === "vt_planned") && (
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/interventions/new?type=technical_survey&project_id=${project.id}`)
                  }
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
                  onClick={() =>
                    navigate(`/interventions/new?type=installation&project_id=${project.id}`)
                  }
                >
                  <Hammer className="h-3.5 w-3.5 mr-1" /> Planifier la pose
                </Button>
              )}
              {project.status === "mes_done" && (
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/interventions/new?type=commissioning&project_id=${project.id}`)
                  }
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
        </TabsContent>

        {/* ── Relevé technique ── */}
        <TabsContent value="releve" className="space-y-3 mt-4">
          <h2 className="text-base font-semibold">Relevé technique</h2>
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Aucun relevé technique enregistré</p>
            <Button size="sm" onClick={() => navigate(`/technical-surveys/new?project=${id}`)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Créer le relevé technique
            </Button>
          </Card>
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="space-y-3 mt-4">
          <h2 className="text-base font-semibold">Documents</h2>
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucun document attaché</p>
          </Card>
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

      {/* Invoices (always visible below tabs) */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Factures ({invoices.length})</h2>
          </div>
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
        </div>
      )}
    </div>
  );
}
