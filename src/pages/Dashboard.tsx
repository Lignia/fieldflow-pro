import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, getISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Euro,
  FileText,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const { kpis, pipeline, loading, error, refetch } = useDashboardKpis();

  const isoWeek = getISOWeek(new Date());
  const firstName = coreUser?.first_name ?? (coreUser as any)?.full_name?.split(" ")[0] ?? "";

  // Show error toast once
  if (error && !loading) {
    toast.error(error, { id: "dashboard-error" });
  }

  const isEmpty =
    !loading &&
    kpis &&
    kpis.revenue.value === 0 &&
    kpis.quotes.count === 0 &&
    kpis.interventions.count === 0 &&
    kpis.overdue.count === 0 &&
    pipeline.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ lineHeight: "1.1" }}
          >
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {firstName
              ? `Bonjour ${firstName} — semaine ${isoWeek}`
              : `Semaine ${isoWeek}`}
          </p>
        </div>
        {error && (
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Réessayer
          </Button>
        )}
      </div>

      {/* Empty state banner */}
      {isEmpty && (
        <Card className="p-5 border-accent/20 bg-accent/5">
          <p className="text-sm text-foreground mb-3">
            Votre espace est prêt. Commencez par créer votre premier client.
          </p>
          <Button size="sm" onClick={() => navigate("/clients/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Créer un client
          </Button>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CA du mois"
          value={kpis ? formatCurrency(kpis.revenue.value) : "0 €"}
          icon={Euro}
          loading={loading}
        />
        <KpiCard
          label="Devis en attente"
          value={kpis?.quotes.count ?? 0}
          subLabel={
            kpis && kpis.quotes.overdue > 0
              ? `dont ${kpis.quotes.overdue} en retard`
              : undefined
          }
          icon={FileText}
          variant={kpis && kpis.quotes.overdue > 0 ? "warning" : "default"}
          loading={loading}
        />
        <KpiCard
          label={kpis?.interventions.label ?? `Interventions S.${isoWeek}`}
          value={kpis?.interventions.count ?? 0}
          subLabel={
            kpis && kpis.interventions.count > 0
              ? `${kpis.interventions.service} SAV · ${kpis.interventions.installation} pose`
              : undefined
          }
          icon={Wrench}
          loading={loading}
        />
        <KpiCard
          label="Impayées > 30j"
          value={kpis?.overdue.count ?? 0}
          subLabel={
            kpis && kpis.overdue.count > 0
              ? formatCurrency(kpis.overdue.amount)
              : undefined
          }
          icon={AlertTriangle}
          variant={kpis && kpis.overdue.count > 0 ? "danger" : "default"}
          loading={loading}
        />
      </div>

      {/* Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Projets en cours</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigate("/projects")}
          >
            Voir tous les projets
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : pipeline.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun projet en cours
            </p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {pipeline.map((project) => (
              <Card
                key={project.id}
                className="p-3.5 cursor-pointer hover:border-accent/20 transition-colors"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {project.project_number}
                  </span>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">
                    {project.customer_name}
                  </span>
                  <StatusBadge status={project.status} type="project" size="sm" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(project.modified_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
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
