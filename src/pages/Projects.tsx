import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  FolderKanban,
  RefreshCw,
  Plus,
  LayoutList,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import {
  useProjects,
  KANBAN_COLUMNS,
  STATUS_FILTER_LABELS,
  type StatusFilter,
  type Project,
} from "@/hooks/useProjects";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewMode = "kanban" | "list";

const FILTER_KEYS: StatusFilter[] = ["active", "archived"];

/* ─── Kanban Card ─────────────────────────────────────────── */

function KanbanCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const card = (
    <Card
      className="p-3 cursor-pointer hover:border-accent/20 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <span className="font-mono text-[11px] text-muted-foreground">
        {project.project_number}
      </span>
      <p className="text-sm font-medium mt-0.5 truncate">{project.customer_name}</p>
      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{project.city}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <StatusBadge status={project.status} type="project" size="sm" />
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(project.modified_at), {
            addSuffix: true,
            locale: fr,
          })}
        </span>
      </div>
    </Card>
  );

  if (project.status === "tech_review_done") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent>
          <p>Relevé technique analysé — prêt pour le devis final</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
}

/* ─── Kanban View ─────────────────────────────────────────── */

function KanbanView({ projects, navigate }: { projects: Project[]; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-max">
        {KANBAN_COLUMNS.map((col) => {
          const colProjects = projects.filter((p) =>
            (col.statuses as readonly string[]).includes(p.status)
          );
          return (
            <div key={col.key} className="w-[260px] shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {colProjects.length}
                </span>
              </div>
              <div className="space-y-2">
                {colProjects.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground">Aucun projet</p>
                  </div>
                ) : (
                  colProjects.map((project) => (
                    <KanbanCard
                      key={project.id}
                      project={project}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

/* ─── List View ───────────────────────────────────────────── */

function ListView({ projects, navigate }: { projects: Project[]; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="space-y-1.5">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              {project.project_number}
            </span>
            <span className="text-sm font-medium flex-1 min-w-0 truncate">
              {project.customer_name}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <MapPin className="h-3 w-3" />
              {project.city}
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
  );
}

/* ─── Main Page ───────────────────────────────────────────── */

export default function Projects() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const {
    projects,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refetch,
  } = useProjects();

  if (error && !loading) {
    toast.error(error, { id: "projects-error" });
  }

  return (
    <div className="space-y-5">
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
        <div className="flex items-center gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Réessayer
            </Button>
          )}
          <Button size="sm" onClick={() => navigate("/projects/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Toolbar: filters + view toggle + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1">
          {FILTER_KEYS.map((key) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter(key)}
            >
              {STATUS_FILTER_LABELS[key]}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex rounded-md border bg-muted p-0.5">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setViewMode("kanban")}
              className="px-2"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setViewMode("list")}
              className="px-2"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
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
                Les projets apparaîtront ici après création.
              </p>
            </>
          )}
        </Card>
      ) : viewMode === "kanban" ? (
        <KanbanView projects={projects} navigate={navigate} />
      ) : (
        <ListView projects={projects} navigate={navigate} />
      )}
    </div>
  );
}
