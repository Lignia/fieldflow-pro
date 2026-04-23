import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  RotateCcw,
  MapPin,
  User,
  FolderKanban,
  Wrench,
  Hammer,
  Zap,
  CalendarCheck,
  AlertTriangle,
  Briefcase,
  Search,
  CalendarClock,
  Loader2,
  FileText,
  Activity,
  Euro,
  ClipboardList,
  ScrollText,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { billingDb, coreDb, operationsDb } from "@/integrations/supabase/schema-clients";
import { toTitleCase } from "@/lib/format";
import { useInterventionDetail } from "@/hooks/useInterventionDetail";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  InterventionStatus,
  InterventionType,
} from "@/hooks/useInterventions";

const TYPE_META: Record<
  InterventionType,
  { label: string; icon: typeof Wrench; iconCls: string; bgCls: string }
> = {
  technical_survey: {
    label: "Visite technique",
    icon: FolderKanban,
    iconCls: "text-blue-600 dark:text-blue-400",
    bgCls: "bg-blue-500/10",
  },
  installation: {
    label: "Pose",
    icon: Hammer,
    iconCls: "text-indigo-600 dark:text-indigo-400",
    bgCls: "bg-indigo-500/10",
  },
  commissioning: {
    label: "Mise en service",
    icon: Zap,
    iconCls: "text-violet-600 dark:text-violet-400",
    bgCls: "bg-violet-500/10",
  },
  sweep: {
    label: "Ramonage",
    icon: Wrench,
    iconCls: "text-orange-600 dark:text-orange-400",
    bgCls: "bg-orange-500/10",
  },
  annual_service: {
    label: "Entretien annuel",
    icon: CalendarCheck,
    iconCls: "text-success",
    bgCls: "bg-success/10",
  },
  repair: {
    label: "Dépannage",
    icon: AlertTriangle,
    iconCls: "text-destructive",
    bgCls: "bg-destructive/10",
  },
  diagnostic: {
    label: "Diagnostic",
    icon: Search,
    iconCls: "text-yellow-600 dark:text-yellow-400",
    bgCls: "bg-yellow-500/10",
  },
  commercial_visit: {
    label: "Visite commerciale",
    icon: Briefcase,
    iconCls: "text-muted-foreground",
    bgCls: "bg-muted",
  },
};

const STATUS_STYLES: Record<InterventionStatus, { label: string; cls: string }> = {
  planned: { label: "Planifiée", cls: "bg-muted text-muted-foreground border-border" },
  scheduled: {
    label: "Confirmée",
    cls: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  },
  in_progress: {
    label: "En cours",
    cls: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  },
  completed: { label: "Terminée", cls: "bg-success/10 text-success border-success/20" },
  cancelled: {
    label: "Annulée",
    cls: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const FLUE_CONDITION_META: Record<
  string,
  { label: string; cls: string }
> = {
  good: {
    label: "Conduit en bon état",
    cls: "bg-success/10 text-success border-success/20",
  },
  average: {
    label: "Conduit moyen",
    cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  },
  poor: {
    label: "Conduit en mauvais état",
    cls: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  },
  critical: {
    label: "Conduit critique — urgent",
    cls: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const SWEEP_TYPE_LABELS: Record<string, string> = {
  simple: "Conduit simple",
  double: "Conduit double",
  tubing: "Tubage",
  desooting: "Débistrage",
};

function fullDateTime(start: string | null, end: string | null): string {
  if (!start) return "Date à définir";
  const s = new Date(start);
  const date = format(s, "EEEE d MMMM yyyy", { locale: fr });
  const startTime = format(s, "H'h'mm", { locale: fr });
  if (!end) return `${date} · ${startTime}`;
  const endTime = format(new Date(end), "H'h'mm", { locale: fr });
  return `${date} · ${startTime} → ${endTime}`;
}

function durationLabel(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (isNaN(ms) || ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function addOneYear(iso: string): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coreUser, tenantId } = useCurrentUser();
  const { intervention, activities, loading, error, notFound, refetch } =
    useInterventionDetail(id);

  const [acting, setActing] = useState<null | "start" | "complete" | "cancel">(null);
  const [mesDialogOpen, setMesDialogOpen] = useState(false);
  const [mesSubmitting, setMesSubmitting] = useState(false);
  const [mesForm, setMesForm] = useState({
    commissioning_date: new Date().toISOString().slice(0, 10),
    serial_number: "",
    brand: "",
    model: "",
    fuel_type: "",
    device_category: "",
    memo: "",
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (notFound || !intervention) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Intervention introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/interventions")}>
          Retour aux interventions
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={refetch}>
          Réessayer
        </Button>
      </div>
    );
  }

  const typeMeta = TYPE_META[intervention.intervention_type];
  const statusMeta = STATUS_STYLES[intervention.status];
  const Icon = typeMeta.icon;
  const duration = durationLabel(
    intervention.start_datetime,
    intervention.end_datetime,
  );

  async function transitionStatus(
    next: InterventionStatus,
    actionKey: "start" | "complete" | "cancel",
  ) {
    if (!intervention) return;
    setActing(actionKey);
    const { error: upErr } = await operationsDb
      .from("interventions")
      .update({ status: next })
      .eq("id", intervention.id);

    if (upErr) {
      setActing(null);
      toast({
        title: "Erreur",
        description: upErr.message,
        variant: "destructive",
      });
      return;
    }

    // If completing a sweep on an installation, update installation dates
    if (
      next === "completed" &&
      intervention.intervention_type === "sweep" &&
      intervention.installation_id &&
      intervention.start_datetime
    ) {
      const last = intervention.start_datetime.slice(0, 10);
      const nextDate = addOneYear(intervention.start_datetime);
      await coreDb
        .from("installations")
        .update({
          last_sweep_date: last,
          next_sweep_date: nextDate,
        })
        .eq("id", intervention.installation_id);
    }

    // Si entretien annuel : mise à jour des dates entretien sur l'installation
    if (
      next === "completed" &&
      intervention.intervention_type === "annual_service" &&
      intervention.installation_id &&
      intervention.start_datetime
    ) {
      const last = intervention.start_datetime.slice(0, 10);
      const nextDate = addOneYear(intervention.start_datetime);
      await coreDb
        .from("installations")
        .update({
          last_service_date: last,
          next_service_date: nextDate,
        })
        .eq("id", intervention.installation_id);
    }

    setActing(null);
    toast({ title: "Statut mis à jour" });
    refetch();
  }

  const showStartButton =
    intervention.status === "planned" || intervention.status === "scheduled";
  const showCompleteButton = intervention.status === "in_progress";
  const showCancelButton =
    intervention.status === "planned" ||
    intervention.status === "scheduled" ||
    intervention.status === "in_progress";

  const isCommissioning = intervention.intervention_type === "commissioning";

  function openMesDialog() {
    if (!intervention) return;
    setMesForm({
      commissioning_date:
        intervention.start_datetime?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
      serial_number: "",
      brand: intervention.brand ?? "",
      model: intervention.model ?? "",
      fuel_type: "",
      device_category: intervention.device_category ?? "",
      memo: "",
    });
    setMesDialogOpen(true);
  }

  async function submitMes() {
    if (!intervention) return;
    if (!tenantId || !coreUser) {
      toast({
        title: "Session non chargée",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      return;
    }
    if (!mesForm.commissioning_date) {
      toast({
        title: "Date requise",
        description: "Saisissez la date de mise en service.",
        variant: "destructive",
      });
      return;
    }
    setMesSubmitting(true);
    const { error: rpcErr } = await operationsDb.rpc("complete_commissioning", {
      p_intervention_id: intervention.id,
      p_tenant_id: tenantId,
      p_actor_id: coreUser.id,
      p_commissioning_date: mesForm.commissioning_date,
      p_serial_number: mesForm.serial_number.trim() || null,
      p_brand: mesForm.brand.trim() || null,
      p_model: mesForm.model.trim() || null,
      p_fuel_type: mesForm.fuel_type || null,
      p_device_category: mesForm.device_category || null,
      p_memo: mesForm.memo.trim() || null,
    });
    setMesSubmitting(false);
    if (rpcErr) {
      toast({
        title: "Erreur",
        description: rpcErr.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Mise en service terminée",
      description: "Installation activée dans le parc.",
    });
    setMesDialogOpen(false);
    refetch();
  }

  const deviceLabel = [intervention.device_type, intervention.brand]
    .filter(Boolean)
    .join(" ");
  const fullAddress = [
    intervention.address_line1,
    [intervention.postal_code, intervention.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
    <div className="space-y-6 max-w-4xl">
      {/* SECTION 1 — Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/interventions")}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux interventions
        </Button>

        {/* Alerte conduit critique / mauvais */}
        {(intervention.flue_condition === "critical" ||
          intervention.flue_condition === "poor") && (
          <Card className="p-4 border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-destructive">
                  Conduit en mauvais état — intervention urgente requise
                </p>
                <p className="text-xs text-muted-foreground">
                  L'état du conduit nécessite une intervention de remise en
                  conformité (tubage, débistrage ou réparation).
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("type", "repair");
                    if (intervention.installation_id) {
                      params.set("installation_id", intervention.installation_id);
                    }
                    navigate(`/interventions/new?${params.toString()}`);
                  }}
                >
                  Planifier l'intervention suivante
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-md",
                  typeMeta.bgCls,
                )}
              >
                <Icon className={cn("h-5 w-5", typeMeta.iconCls)} />
              </div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ lineHeight: "1.1" }}
              >
                {typeMeta.label}
              </h1>
              <Badge variant="outline" className={cn("font-normal", statusMeta.cls)}>
                {statusMeta.label}
              </Badge>
              {intervention.rescheduled_from_id && (
                <Badge
                  variant="outline"
                  className="font-normal gap-1 bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reprogrammée
                </Badge>
              )}
              {intervention.followup_needed && (
                <Badge
                  variant="outline"
                  className="font-normal gap-1 bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400"
                >
                  <ClipboardList className="h-3 w-3" />
                  Suite à planifier
                </Badge>
              )}
              {intervention.quote_needed && (
                <Badge
                  variant="outline"
                  className="font-normal gap-1 bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400"
                >
                  <Euro className="h-3 w-3" />
                  Devis à établir
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {fullDateTime(intervention.start_datetime, intervention.end_datetime)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {showStartButton && (
              <Button
                onClick={() => transitionStatus("in_progress", "start")}
                disabled={!!acting}
                size="sm"
              >
                {acting === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                Marquer en cours
              </Button>
            )}
            {showCompleteButton && (
              <Button
                onClick={() =>
                  isCommissioning
                    ? openMesDialog()
                    : transitionStatus("completed", "complete")
                }
                disabled={!!acting || mesSubmitting}
                size="sm"
                variant="success"
              >
                {acting === "complete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isCommissioning ? "Finaliser la mise en service" : "Marquer terminée"}
              </Button>
            )}
            {showCancelButton && (
              <Button
                onClick={() => transitionStatus("cancelled", "cancel")}
                disabled={!!acting}
                size="sm"
                variant="outline"
              >
                {acting === "cancel" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Annuler
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2 — Context */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: customer + links */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Client & lieu
            </h2>
            {intervention.customer_id ? (
              <button
                onClick={() => navigate(`/clients/${intervention.customer_id}`)}
                className="flex items-start gap-2 text-left hover:text-primary"
              >
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {intervention.customer_name
                      ? toTitleCase(intervention.customer_name)
                      : "Client"}
                  </p>
                  {intervention.customer_phone && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {intervention.customer_phone}
                    </p>
                  )}
                </div>
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun client lié</p>
            )}

            {fullAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{fullAddress}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 pt-2">
              {intervention.project_id && (
                <button
                  onClick={() => navigate(`/projects/${intervention.project_id}`)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline w-fit"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  Projet {intervention.project_number ?? ""}
                </button>
              )}
              {intervention.service_request_id && (
                <button
                  onClick={() =>
                    navigate(`/service-requests/${intervention.service_request_id}`)
                  }
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline w-fit"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Demande SAV
                </button>
              )}
              {intervention.installation_id && deviceLabel && (
                <button
                  onClick={() =>
                    navigate(`/installations/${intervention.installation_id}`)
                  }
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline w-fit"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {deviceLabel}
                </button>
              )}
            </div>
          </div>

          {/* Right column: details */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Détails
            </h2>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">Technicien : </span>
                <span className="font-medium">
                  {intervention.assigned_to_name
                    ? toTitleCase(intervention.assigned_to_name)
                    : "Non assigné"}
                </span>
              </div>
              {duration && (
                <div>
                  <span className="text-muted-foreground">Durée : </span>
                  <span className="font-mono">{duration}</span>
                </div>
              )}
              {intervention.certificate_number && (
                <div>
                  <span className="text-muted-foreground">Certificat : </span>
                  <span className="font-mono">{intervention.certificate_number}</span>
                </div>
              )}
              {intervention.sweep_type && (
                <div>
                  <span className="text-muted-foreground">Type : </span>
                  <span className="font-medium">
                    Ramonage {SWEEP_TYPE_LABELS[intervention.sweep_type] ?? intervention.sweep_type}
                  </span>
                </div>
              )}
              {intervention.flue_condition && FLUE_CONDITION_META[intervention.flue_condition] && (
                <div className="pt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-normal",
                      FLUE_CONDITION_META[intervention.flue_condition].cls,
                    )}
                  >
                    {FLUE_CONDITION_META[intervention.flue_condition].label}
                  </Badge>
                </div>
              )}
              {intervention.error_code && (
                <div className="pt-1">
                  <Badge
                    variant="outline"
                    className="font-normal gap-1 bg-destructive/10 text-destructive border-destructive/20"
                  >
                    <Bug className="h-3 w-3" />
                    Code erreur :{" "}
                    <span className="font-mono ml-0.5">{intervention.error_code}</span>
                  </Badge>
                </div>
              )}
            </div>

            {intervention.diagnosis_notes && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Rapport de dépannage
                </p>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-muted/40 rounded-md p-3 border border-border">
                  {intervention.diagnosis_notes}
                </pre>
              </div>
            )}

            {intervention.parts_replaced && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Pièces remplacées</p>
                <p className="text-sm whitespace-pre-wrap">
                  {intervention.parts_replaced}
                </p>
              </div>
            )}
            {intervention.next_service_recommendation && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Recommandation</p>
                <p className="text-sm whitespace-pre-wrap">
                  {intervention.next_service_recommendation}
                </p>
              </div>
            )}

            {intervention.internal_notes && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Notes internes</p>
                <p className="text-sm whitespace-pre-wrap">
                  {intervention.internal_notes}
                </p>
              </div>
            )}
            {intervention.customer_visible_notes && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Notes client</p>
                <p className="text-sm whitespace-pre-wrap">
                  {intervention.customer_visible_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* SECTION 3 — Mise à jour installation après complétion */}
      {intervention.status === "completed" &&
        intervention.installation_id &&
        intervention.start_datetime &&
        (intervention.intervention_type === "sweep" ||
          intervention.intervention_type === "annual_service") && (
          <Card className="p-4 bg-success/5 border-success/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Installation mise à jour</p>
                <p>
                  <span className="text-muted-foreground">
                    {intervention.intervention_type === "sweep"
                      ? "Dernier ramonage : "
                      : "Dernier entretien : "}
                  </span>
                  <span className="font-mono">
                    {format(new Date(intervention.start_datetime), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {intervention.intervention_type === "sweep"
                      ? "Prochain ramonage prévu : "
                      : "Prochain entretien prévu : "}
                  </span>
                  <span className="font-mono">
                    {format(new Date(addOneYear(intervention.start_datetime)), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        )}

      {/* SECTION — Suites */}
      {intervention.status === "completed" && (
        <SuitesSection
          intervention={intervention}
          onNavigate={navigate}
          onToast={toast}
        />
      )}

      {/* SECTION 4 — Activities */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historique
          </h2>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {activities.length}
          </Badge>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune activité enregistrée pour cette intervention.
          </p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 text-sm border-l-2 border-border pl-3"
              >
                <FileText className="h-3.5 w-3.5 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{a.activity_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.occurred_at), "d MMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>

    {/* Dialog Finaliser MES */}
    <Dialog open={mesDialogOpen} onOpenChange={setMesDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Finaliser la mise en service</DialogTitle>
          <DialogDescription>
            Ces informations alimenteront la fiche installation dans le parc client.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mes-date">Date de mise en service *</Label>
            <Input
              id="mes-date"
              type="date"
              value={mesForm.commissioning_date}
              onChange={(e) =>
                setMesForm((f) => ({ ...f, commissioning_date: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mes-brand">Marque</Label>
              <Input
                id="mes-brand"
                value={mesForm.brand}
                onChange={(e) => setMesForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Jotul, Stûv…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mes-model">Modèle</Label>
              <Input
                id="mes-model"
                value={mesForm.model}
                onChange={(e) => setMesForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="F305, P-10…"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mes-serial">Numéro de série</Label>
            <Input
              id="mes-serial"
              value={mesForm.serial_number}
              onChange={(e) =>
                setMesForm((f) => ({ ...f, serial_number: e.target.value }))
              }
              placeholder="Relevé sur la plaque signalétique"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mes-fuel">Combustible</Label>
            <Select
              value={mesForm.fuel_type}
              onValueChange={(v) => setMesForm((f) => ({ ...f, fuel_type: v }))}
            >
              <SelectTrigger id="mes-fuel">
                <SelectValue placeholder="Choisir un combustible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wood">Bois</SelectItem>
                <SelectItem value="pellet">Granulés</SelectItem>
                <SelectItem value="gas">Gaz</SelectItem>
                <SelectItem value="oil">Fioul</SelectItem>
                <SelectItem value="mixed">Mixte</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mes-memo">Mémo</Label>
            <Textarea
              id="mes-memo"
              value={mesForm.memo}
              onChange={(e) => setMesForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="Notes pour le dossier client…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setMesDialogOpen(false)}
            disabled={mesSubmitting}
          >
            Annuler
          </Button>
          <Button onClick={submitMes} disabled={mesSubmitting} variant="success">
            {mesSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Finaliser la MES
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ============================================================
// SuitesSection — actions de suite après intervention terminée
// ============================================================
interface SuitesSectionProps {
  intervention: ReturnType<typeof useInterventionDetail>["intervention"];
  onNavigate: (path: string) => void;
  onToast: ReturnType<typeof useToast>["toast"];
}

function SuitesSection({ intervention, onNavigate, onToast }: SuitesSectionProps) {
  if (!intervention) return null;

  const t = intervention.intervention_type;

  function handleCreateQuote() {
    if (intervention?.project_id) {
      onNavigate(`/projects/${intervention.project_id}?tab=devis`);
    } else {
      onToast({
        title: "Projet requis",
        description: "Créez d'abord un projet pour ce client.",
      });
    }
  }

  function handleSoonV3() {
    onToast({ title: "Disponible prochainement — V3" });
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Suites
        </h2>
      </div>

      {intervention.followup_needed && (
        <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <ClipboardList className="h-4 w-4 mt-0.5 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Suite nécessaire</p>
              {intervention.followup_notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {intervention.followup_notes}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("type", intervention.intervention_type);
              if (intervention.installation_id) {
                params.set("installation_id", intervention.installation_id);
              }
              onNavigate(`/interventions/new?${params.toString()}`);
            }}
          >
            Planifier l'intervention suivante
          </Button>
        </div>
      )}

      {intervention.quote_needed && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Euro className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Devis à établir</p>
              <p className="text-sm text-muted-foreground mt-1">
                Un devis est nécessaire suite à cette intervention.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleCreateQuote}>
            Créer un devis
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {t === "sweep" && (
          <>
            <Button size="sm" variant="outline" onClick={handleSoonV3}>
              <FileText className="h-4 w-4" />
              Générer le certificat de ramonage
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("/invoices/new")}>
              <Euro className="h-4 w-4" />
              Créer la facture
            </Button>
          </>
        )}
        {t === "annual_service" && (
          <Button size="sm" variant="outline" onClick={() => onNavigate("/invoices/new")}>
            <Euro className="h-4 w-4" />
            Créer la facture
          </Button>
        )}
        {(t === "installation" || t === "commissioning") && (
          <>
          {t === "commissioning" && intervention.start_datetime && (
            <div className="rounded-md border border-success/30 bg-success/5 p-4 space-y-2 w-full">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-success" />
                Mise en service réalisée
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Date : </span>
                <span className="font-mono">
                  {format(new Date(intervention.start_datetime), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {intervention.installation_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onNavigate(`/installations/${intervention.installation_id}`)
                    }
                  >
                    <Wrench className="h-4 w-4" />
                    Voir l'installation dans le parc
                  </Button>
                )}
                {intervention.project_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate(`/projects/${intervention.project_id}`)}
                  >
                    <FolderKanban className="h-4 w-4" />
                    Voir le projet
                  </Button>
                )}
              </div>
            </div>
          )}
            <Button size="sm" variant="outline" onClick={handleSoonV3}>
              <FileText className="h-4 w-4" />
              Créer le PV de réception
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("/invoices/new")}>
              <Euro className="h-4 w-4" />
              Créer la facture solde
            </Button>
          </>
        )}
        {t === "technical_survey" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onNavigate(
                  `/technical-surveys/new${
                    intervention.project_id ? `?project=${intervention.project_id}` : ""
                  }`,
                )
              }
            >
              <ClipboardList className="h-4 w-4" />
              Créer le relevé technique
            </Button>
            <Button size="sm" variant="outline" onClick={handleCreateQuote}>
              <Euro className="h-4 w-4" />
              Créer le devis estimatif
            </Button>
          </>
        )}
        {(t === "repair" || t === "diagnostic") && (
          <Button size="sm" variant="outline" onClick={() => onNavigate("/invoices/new")}>
            <Euro className="h-4 w-4" />
            Créer la facture
          </Button>
        )}
      </div>
    </Card>
  );
}
