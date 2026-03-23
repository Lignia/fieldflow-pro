import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, FolderKanban, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  useProjects,
  STATUS_GROUP_LABELS,
  type StatusGroup,
} from "@/hooks/useProjects";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

const TAB_KEYS: StatusGroup[] = ["all", "leads", "commercial", "signed", "closed"];

export default function Projects() {
  const navigate = useNavigate();
  const {
    projects,
    loading,
    error,
    search,
    setSearch,
    statusGroup,
    setStatusGroup,
    refetch,
  } = useProjects();

  if (error && !loading) {
    toast.error(error, { id: "projects-error" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Projets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Chargement…"
              : `${projects.length} projet${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {error && (
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Réessayer
          </Button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TAB_KEYS.map((key) => (
          <Button
            key={key}
            variant={statusGroup === key ? "default" : "ghost"}
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => setStatusGroup(key)}
          >
            {STATUS_GROUP_LABELS[key]}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par client ou n° projet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          {search.trim() ? (
            <p className="text-sm text-muted-foreground">
              Aucun projet ne correspond à « {search} »
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                Aucun projet dans cette catégorie
              </p>
              <p className="text-xs text-muted-foreground">
                Les projets apparaîtront ici après création d'un premier client.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                {/* Project number */}
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  {project.project_number}
                </span>

                {/* Customer name */}
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {project.customer_name}
                </span>

                {/* Status badge */}
                <StatusBadge status={project.status} type="project" size="sm" />

                {/* Origin */}
                <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
                  {ORIGIN_LABELS[project.origin] ?? project.origin}
                </span>

                {/* Relative date */}
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
  );
}
