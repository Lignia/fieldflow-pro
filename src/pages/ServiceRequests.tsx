import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Wrench,
  Plus,
  Search,
  Zap,
  Calendar,
  Shield,
  Euro,
  HelpCircle,
  AlertCircle,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useServiceRequests,
  type ServiceRequest,
  type ServiceRequestActiveFilter,
  type ServiceRequestCategory,
  type ServiceRequestPriority,
  type ServiceRequestStatus,
} from "@/hooks/useServiceRequests";
import { toTitleCase } from "@/lib/format";

const PRIORITY_STYLES: Record<ServiceRequestPriority, { label: string; cls: string }> = {
  critical: { label: "Critique", cls: "bg-destructive/10 text-destructive border-destructive/20" },
  high: { label: "Haute", cls: "bg-warning/10 text-warning border-warning/20" },
  medium: { label: "Moyenne", cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400" },
  low: { label: "Basse", cls: "bg-muted text-muted-foreground border-border" },
};

const STATUS_STYLES: Record<ServiceRequestStatus, { label: string; cls: string }> = {
  new: { label: "Nouvelle", cls: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400" },
  qualified: { label: "Qualifiée", cls: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400" },
  scheduled: { label: "Planifiée", cls: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-400" },
  in_progress: { label: "En cours", cls: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400" },
  closed: { label: "Clôturée", cls: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Annulée", cls: "bg-muted text-muted-foreground border-border" },
};

const CATEGORY_META: Record<
  ServiceRequestCategory,
  { label: string; icon: typeof Wrench }
> = {
  breakdown: { label: "Panne", icon: Zap },
  sweep: { label: "Ramonage", icon: Wrench },
  annual_service: { label: "Entretien", icon: Calendar },
  warranty_claim: { label: "Garantie", icon: Shield },
  commercial: { label: "Commercial", icon: Euro },
  other: { label: "Autre", icon: HelpCircle },
};

function CategoryBadge({ category }: { category: ServiceRequestCategory | null }) {
  if (!category) return null;
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function RequestCard({ req, onClick }: { req: ServiceRequest; onClick: () => void }) {
  const prio = PRIORITY_STYLES[req.priority];
  const status = STATUS_STYLES[req.status];
  const deviceLine = [req.device_type, req.brand].filter(Boolean).join(" • ");

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer p-4 hover:border-primary/40"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("font-normal", prio.cls)}>
            {prio.label}
          </Badge>
          <Badge variant="outline" className={cn("font-normal", status.cls)}>
            {status.label}
          </Badge>
          <CategoryBadge category={req.request_category} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {req.customer_name ? toTitleCase(req.customer_name) : "Client inconnu"}
          </span>
          {req.customer_phone && (
            <span className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs">
              <Phone className="h-3.5 w-3.5" />
              {req.customer_phone}
            </span>
          )}
        </div>

        {deviceLine && (
          <p className="text-xs text-muted-foreground">{deviceLine}</p>
        )}

        {req.notes && (
          <p className="text-xs text-muted-foreground line-clamp-1">{req.notes}</p>
        )}

        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span className="font-mono">
            {format(new Date(req.requested_at), "d MMM yyyy", { locale: fr })}
          </span>
          {req.assigned_to_name && (
            <span>Assignée à {toTitleCase(req.assigned_to_name)}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ filter, search }: { filter: ServiceRequestActiveFilter; search: string }) {
  let msg = "Aucune demande SAV pour le moment.";
  if (search) msg = `Aucun résultat pour "${search}".`;
  else if (filter === "open") msg = "Aucune demande ouverte.";
  else if (filter === "critical") msg = "Aucune demande critique. Tout est sous contrôle.";
  else if (filter === "sweep") msg = "Aucune demande de ramonage.";
  else if (filter === "maintenance") msg = "Aucune demande d'entretien annuel.";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Wrench className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

export default function ServiceRequests() {
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
  } = useServiceRequests();

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur de chargement",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filters: { key: ServiceRequestActiveFilter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "open", label: "Ouvertes", count: counts.open },
    { key: "critical", label: "Critiques", count: counts.critical },
    { key: "sweep", label: "Ramonage", count: counts.sweep },
    { key: "maintenance", label: "Entretien", count: counts.maintenance },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Demandes SAV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.all} demande{counts.all > 1 ? "s" : ""} au total
          </p>
        </div>
        <Button onClick={() => navigate("/service-requests/new")} size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par client ou notes…"
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
                  activeFilter === f.key && "bg-primary-foreground/20 text-primary-foreground",
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
            Impossible de charger les demandes SAV.
          </p>
          <Button onClick={refetch} variant="outline" size="sm">
            Réessayer
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={activeFilter} search={search} />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onClick={() => navigate(`/service-requests/${req.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
