import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus,
  Search,
  AlertCircle,
  User,
  MapPin,
  FolderKanban,
  Hammer,
  Zap,
  Wrench,
  CalendarCheck,
  AlertTriangle,
  Briefcase,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useInterventions,
  type Intervention,
  type InterventionActiveFilter,
  type InterventionStatus,
  type InterventionType,
} from "@/hooks/useInterventions";
import { toTitleCase } from "@/lib/format";

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

function formatDateTimeRange(start: string | null, end: string | null): string {
  if (!start) return "Date à définir";
  const startDate = new Date(start);
  const datePart = format(startDate, "EEE d MMM", { locale: fr });
  const startTime = format(startDate, "H'h'mm", { locale: fr });
  if (!end) return `${datePart} · ${startTime}`;
  const endTime = format(new Date(end), "H'h'mm", { locale: fr });
  return `${datePart} · ${startTime} → ${endTime}`;
}

function InterventionCard({
  intervention,
  onClick,
}: {
  intervention: Intervention;
  onClick: () => void;
}) {
  const typeMeta = TYPE_META[intervention.intervention_type];
  const statusMeta = STATUS_STYLES[intervention.status];
  const Icon = typeMeta.icon;

  const projectLabel = intervention.project_number
    ? `Projet ${intervention.project_number}`
    : null;
  const deviceLabel = [intervention.device_type, intervention.brand]
    .filter(Boolean)
    .join(" ");
  const locationLabel = intervention.city
    ? `${toTitleCase(intervention.city)}`
    : null;

  return (
    <Card onClick={onClick} className="cursor-pointer p-4 hover:border-primary/40">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md",
              typeMeta.bgCls,
            )}
          >
            <Icon className={cn("h-4 w-4", typeMeta.iconCls)} />
          </div>
          <span className="text-sm font-medium">{typeMeta.label}</span>
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
        </div>

        <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDateTimeRange(intervention.start_datetime, intervention.end_datetime)}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {intervention.customer_name
              ? toTitleCase(intervention.customer_name)
              : "Client inconnu"}
          </span>
          {locationLabel && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPin className="h-3 w-3" />
              {locationLabel}
            </span>
          )}
        </div>

        {(projectLabel || deviceLabel) && (
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {projectLabel && <span className="font-mono">{projectLabel}</span>}
            {deviceLabel && <span>{deviceLabel}</span>}
          </div>
        )}

        {intervention.assigned_to_name && (
          <p className="text-xs text-muted-foreground pt-1">
            Technicien : {toTitleCase(intervention.assigned_to_name)}
          </p>
        )}
      </div>
    </Card>
  );
}

function EmptyState({
  filter,
  search,
}: {
  filter: InterventionActiveFilter;
  search: string;
}) {
  let msg = "Aucune intervention planifiée pour le moment.";
  if (search) msg = `Aucun résultat pour "${search}".`;
  else if (filter === "today") msg = "Aucune intervention prévue aujourd'hui.";
  else if (filter === "project")
    msg = "Aucune intervention liée à un projet (pose, VT, MES).";
  else if (filter === "aftercare")
    msg = "Aucune intervention SAV ou récurrente (ramonage, entretien, dépannage).";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <CalendarClock className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

export default function Interventions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    filtered,
    loading,
    error,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    counts,
    refetch,
  } = useInterventions();

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur de chargement",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filters: { key: InterventionActiveFilter; label: string; count: number }[] = [
    { key: "all", label: "Toutes", count: counts.all },
    { key: "today", label: "Aujourd'hui", count: counts.today },
    { key: "project", label: "Projets", count: counts.project },
    { key: "aftercare", label: "SAV & Récurrent", count: counts.aftercare },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ lineHeight: "1.1" }}
          >
            Interventions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.all} intervention{counts.all > 1 ? "s" : ""} au total
          </p>
        </div>
        <Button onClick={() => navigate("/interventions/new")} size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle intervention
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par client…"
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={activeFilter === f.key ? "default" : "outline"}
              onClick={() => setActiveFilter(f.key)}
              className="h-8"
            >
              {f.label}
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1.5 h-5 px-1.5 font-mono text-[10px]",
                  activeFilter === f.key &&
                    "bg-primary-foreground/20 text-primary-foreground",
                )}
              >
                {f.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {error && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Impossible de charger les interventions.
          </p>
          <Button onClick={refetch} variant="outline" size="sm">
            Réessayer
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={activeFilter} search={search} />
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <InterventionCard
              key={it.id}
              intervention={it}
              onClick={() => navigate(`/interventions/${it.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
