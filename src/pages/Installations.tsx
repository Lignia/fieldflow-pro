import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Flame, Radiator, Plus, Search, RefreshCw, MapPin, Wrench, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/format";
import { useInstallations, type Installation, type DeviceCategory } from "@/hooks/useInstallations";

type QuickFilter = "all" | "sweep_due" | "with_contract";

function deviceIcon(category: DeviceCategory | null) {
  if (category === "boiler") return Radiator;
  return Flame;
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), "d MMM yyyy", { locale: fr });
  } catch {
    return null;
  }
}

function dueState(date: string | null): "overdue" | "soon" | "ok" | null {
  if (!date) return null;
  try {
    const diff = differenceInDays(parseISO(date), new Date());
    if (diff < 0) return "overdue";
    if (diff <= 30) return "soon";
    return "ok";
  } catch {
    return null;
  }
}

function DueBadge({ label, date, icon: Icon }: { label: string; date: string | null; icon: typeof Wrench }) {
  if (!date) return null;
  const state = dueState(date);
  const formatted = formatDate(date);

  const cls =
    state === "overdue"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : state === "soon"
      ? "bg-warning/15 text-warning border-warning/20"
      : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        cls
      )}
    >
      <Icon className="h-3 w-3" />
      {label} {formatted}
      {state === "overdue" && <AlertTriangle className="h-3 w-3 ml-0.5" />}
    </span>
  );
}

function isSweepDue(inst: Installation): boolean {
  const s = dueState(inst.next_sweep_date);
  return s === "overdue" || s === "soon";
}

function InstallationRow({ inst, onClick }: { inst: Installation; onClick: () => void }) {
  const Icon = deviceIcon(inst.device_category);
  const equipment = [inst.brand, inst.model].filter(Boolean).join(" ");
  const customerLabel = inst.customer_name ? toTitleCase(inst.customer_name) : "Client inconnu";
  const location = [inst.address_line1, inst.city].filter(Boolean).join(", ");

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer p-4 hover:border-accent/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="font-medium text-sm group-hover:text-accent transition-colors truncate">
                {inst.device_type || "Appareil"}
                {equipment && <span className="text-muted-foreground font-normal"> · {equipment}</span>}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {customerLabel}
                {location && (
                  <span className="inline-flex items-center gap-1 ml-2">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <StatusBadge status={inst.status} type="installation" />
              {inst.installed_by_self === false && (
                <Badge variant="warning" className="bg-warning/15 text-warning border-warning/20">
                  Repris
                </Badge>
              )}
              {inst.has_maintenance_contract && (
                <Badge variant="success" className="bg-accent/15 text-accent border-accent/20">
                  Contrat entretien
                </Badge>
              )}
            </div>
          </div>

          {inst.serial_number && (
            <p className="text-xs font-mono text-muted-foreground mb-2">S/N {inst.serial_number}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <DueBadge label="Ramonage" date={inst.next_sweep_date} icon={Wrench} />
            <DueBadge label="Révision" date={inst.next_service_date} icon={Calendar} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  search,
  filter,
  onCreate,
}: {
  search: string;
  filter: QuickFilter;
  onCreate: () => void;
}) {
  const hasFilter = search || filter !== "all";
  return (
    <Card className="p-10 text-center">
      <Flame className="h-10 w-10 mx-auto opacity-30 mb-3" />
      <p className="font-medium">
        {hasFilter ? "Aucune installation ne correspond" : "Aucune installation pour l'instant"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        {hasFilter
          ? "Ajustez votre recherche ou vos filtres."
          : "Ajoutez vos appareils posés ou repris pour suivre ramonages et révisions."}
      </p>
      {!hasFilter && (
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle installation
        </Button>
      )}
    </Card>
  );
}

export default function Installations() {
  const navigate = useNavigate();
  const { installations, loading, error, search, setSearch, refetch } = useInstallations();
  const [filter, setFilter] = useState<QuickFilter>("all");

  useEffect(() => {
    if (error) toast.error(`Chargement impossible : ${error}`);
  }, [error]);

  const filtered = useMemo(() => {
    if (filter === "sweep_due") return installations.filter(isSweepDue);
    if (filter === "with_contract") return installations.filter((i) => i.has_maintenance_contract);
    return installations;
  }, [installations, filter]);

  const sweepDueCount = useMemo(() => installations.filter(isSweepDue).length, [installations]);
  const contractCount = useMemo(
    () => installations.filter((i) => i.has_maintenance_contract).length,
    [installations]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parc installé</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${installations.length} installation${installations.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Réessayer
            </Button>
          )}
          <Button size="sm" onClick={() => navigate("/installations/new")}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle installation
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client ou un appareil…"
            className="pl-9 h-9"
          />
        </div>

        <Button
          variant={filter === "all" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Tous
        </Button>
        <Button
          variant={filter === "sweep_due" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("sweep_due")}
          className={cn(filter === "sweep_due" && "border-warning/30")}
        >
          <Wrench className="h-3.5 w-3.5 mr-1" />
          Ramonage à planifier
          {sweepDueCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-warning/20 text-warning text-xs px-1.5 min-w-[1.25rem] h-5">
              {sweepDueCount}
            </span>
          )}
        </Button>
        <Button
          variant={filter === "with_contract" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("with_contract")}
        >
          Avec contrat entretien
          {contractCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-accent/15 text-accent text-xs px-1.5 min-w-[1.25rem] h-5">
              {contractCount}
            </span>
          )}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          search={search}
          filter={filter}
          onCreate={() => navigate("/installations/new")}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((inst) => (
            <InstallationRow
              key={inst.id}
              inst={inst}
              onClick={() => navigate(`/installations/${inst.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}