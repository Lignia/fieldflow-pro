import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO, differenceInDays, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Flame,
  Thermometer,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wrench,
  Pencil,
  Save,
  X,
  RefreshCw,
  Activity as ActivityIcon,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/format";
import { coreDb } from "@/integrations/supabase/schema-clients";
import {
  useInstallationDetail,
  type InstallationDetail as TInstallation,
  type InstallationActivity,
} from "@/hooks/useInstallationDetail";

// ---------- Helpers ----------

const FUEL_LABELS: Record<string, string> = {
  wood: "Bois bûche",
  pellet: "Granulé",
  gas: "Gaz",
  oil: "Fioul",
  mixed: "Mixte",
  other: "Autre",
};

function deviceIcon(category: string | null) {
  if (category === "boiler") return Thermometer;
  return Flame;
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), "d MMM yyyy", { locale: fr });
  } catch {
    return null;
  }
}

function fmtDateTime(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), "d MMM yyyy à HH:mm", { locale: fr });
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

function warrantyState(start: string | null, end: string | null): "active" | "expired" | "none" {
  if (!start && !end) return "none";
  try {
    const now = new Date();
    if (end && parseISO(end) < now) return "expired";
    if (start && end && isWithinInterval(now, { start: parseISO(start), end: parseISO(end) }))
      return "active";
    if (end && parseISO(end) >= now) return "active";
    return "expired";
  } catch {
    return "none";
  }
}

function activityLabel(a: InstallationActivity): string {
  const map: Record<string, string> = {
    installation_created: "Installation créée",
    installation_updated: "Installation modifiée",
    sweep_completed: "Ramonage effectué",
    service_completed: "Entretien effectué",
    memo_updated: "Mémo modifié",
    status_changed: "Statut modifié",
    intervention_scheduled: "Intervention planifiée",
  };
  return map[a.activity_type] ?? a.activity_type.replace(/_/g, " ");
}

// ---------- Sub-components ----------

function DueDateLine({ label, date }: { label: string; date: string | null }) {
  const state = dueState(date);
  const formatted = fmtDate(date);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {date && formatted ? (
        <Badge
          variant={state === "overdue" ? "destructive" : state === "soon" ? "warning" : "success"}
          className="font-mono text-xs"
        >
          {formatted}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground italic">Non renseigné</span>
      )}
    </div>
  );
}

function WarrantyBlock({
  title,
  start,
  end,
}: {
  title: string;
  start: string | null;
  end: string | null;
}) {
  const state = warrantyState(start, end);
  const startF = fmtDate(start);
  const endF = fmtDate(end);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{title}</span>
        {state === "active" && (
          <Badge variant="success" className="text-xs">
            En cours
          </Badge>
        )}
        {state === "expired" && (
          <Badge variant="destructive" className="text-xs">
            Expirée
          </Badge>
        )}
      </div>
      {state !== "none" ? (
        <p className="font-mono text-xs text-muted-foreground">
          {startF ?? "—"} → {endF ?? "—"}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Aucune date</p>
      )}
    </div>
  );
}

// ---------- Page ----------

export default function InstallationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { installation, activities, loading, error, notFound, refetch } =
    useInstallationDetail(id);

  const [editingMemo, setEditingMemo] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

  useEffect(() => {
    if (notFound) {
      toast.error("Installation introuvable");
      navigate("/installations", { replace: true });
    }
  }, [notFound, navigate]);

  useEffect(() => {
    if (installation) setMemoDraft(installation.memo ?? "");
  }, [installation]);

  const status = installation?.installation_status ?? installation?.status ?? null;
  const Icon = useMemo(() => deviceIcon(installation?.device_category ?? null), [installation]);

  async function handleSaveMemo() {
    if (!installation) return;
    setSavingMemo(true);
    const { error: updErr } = await coreDb
      .from("installations")
      .update({ memo: memoDraft.trim() || null })
      .eq("id", installation.id);
    setSavingMemo(false);

    if (updErr) {
      toast.error("Échec de la sauvegarde du mémo");
      return;
    }
    toast.success("Mémo enregistré");
    setEditingMemo(false);
    refetch();
  }

  // ----- Loading -----
  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  // ----- Error -----
  if (error) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-4">
          <p className="text-sm text-destructive">Impossible de charger l'installation.</p>
          <p className="text-xs text-muted-foreground font-mono">{error}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/installations")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!installation) return null;

  const fuelLabel = installation.fuel_type ? FUEL_LABELS[installation.fuel_type] ?? installation.fuel_type : null;
  const equipmentParts = [installation.brand, installation.model].filter(Boolean).join(" ");
  const fullAddress = [
    installation.address_line1,
    installation.address_line2,
    [installation.postal_code, installation.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* SECTION 1 — En-tête */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/installations")}
          className="mb-3 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Parc installé
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight truncate">
                {installation.device_type ?? "Appareil"}
              </h1>
              {equipmentParts && (
                <p className="text-sm text-muted-foreground mt-0.5">{equipmentParts}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {status && <StatusBadge status={status} type="installation" />}
                {installation.installed_by_self === false && (
                  <Badge variant="warning" className="text-xs">
                    Repris
                  </Badge>
                )}
                {fuelLabel && (
                  <Badge variant="outline" className="text-xs">
                    {fuelLabel}
                  </Badge>
                )}
                {installation.has_maintenance_contract && (
                  <Badge variant="success" className="text-xs gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Contrat entretien
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — Infos appareil */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Informations appareil</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Colonne gauche */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Numéro de série</span>
              <span className="font-mono">{installation.serial_number ?? "—"}</span>
            </div>
            {installation.barcode_id && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Code-barres</span>
                <span className="font-mono">{installation.barcode_id}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Mise en service</span>
              <span className="font-mono">{fmtDate(installation.commissioning_date) ?? "—"}</span>
            </div>
            {installation.installed_by_self === false && installation.takeover_date && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Repris le</span>
                <span className="font-mono">{fmtDate(installation.takeover_date)}</span>
              </div>
            )}
            {installation.project_id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start mt-2"
                onClick={() => navigate(`/projects/${installation.project_id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Voir le projet d'origine
              </Button>
            )}
          </div>

          {/* Colonne droite — Garanties */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Garanties
            </h3>
            {!installation.manufacturer_warranty_start &&
            !installation.manufacturer_warranty_end &&
            !installation.service_warranty_start &&
            !installation.service_warranty_end ? (
              <p className="text-sm text-muted-foreground italic">
                Aucune garantie enregistrée
              </p>
            ) : (
              <div className="space-y-3">
                <WarrantyBlock
                  title="Garantie constructeur"
                  start={installation.manufacturer_warranty_start}
                  end={installation.manufacturer_warranty_end}
                />
                <Separator />
                <WarrantyBlock
                  title="Garantie poseur"
                  start={installation.service_warranty_start}
                  end={installation.service_warranty_end}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* SECTION 3 — Cycle de suivi */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Ramonage */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Ramonage</h3>
          </div>
          <div className="space-y-2">
            <DueDateLine label="Dernier" date={installation.last_sweep_date} />
            <DueDateLine label="Prochain" date={installation.next_sweep_date} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate("/interventions/new")}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Planifier
          </Button>
        </Card>

        {/* Révision */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Révision / Entretien</h3>
          </div>
          <div className="space-y-2">
            <DueDateLine label="Dernier" date={installation.last_service_date} />
            <DueDateLine label="Prochain" date={installation.next_service_date} />
          </div>
          {installation.has_maintenance_contract && (
            <div className="rounded-md bg-accent/10 p-2 space-y-1">
              <Badge variant="success" className="text-xs">
                Contrat actif
              </Badge>
              <p className="text-xs text-muted-foreground font-mono">
                {fmtDate(installation.maintenance_contract_start) ?? "—"} →{" "}
                {fmtDate(installation.maintenance_contract_end) ?? "—"}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate("/interventions/new")}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Planifier
          </Button>
        </Card>

        {/* Client */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Client & adresse</h3>
          </div>
          {installation.customer_id ? (
            <button
              type="button"
              onClick={() => navigate(`/clients/${installation.customer_id}`)}
              className="text-sm font-medium hover:underline text-left block w-full truncate"
            >
              {installation.customer_name
                ? toTitleCase(installation.customer_name)
                : "Client"}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground italic">Aucun client lié</p>
          )}

          <div className="space-y-1.5 text-xs">
            {installation.customer_phone && (
              <a
                href={`tel:${installation.customer_phone}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-3 w-3" />
                <span className="font-mono">{installation.customer_phone}</span>
              </a>
            )}
            {installation.customer_email && (
              <a
                href={`mailto:${installation.customer_email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
              >
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{installation.customer_email}</span>
              </a>
            )}
            {fullAddress && (
              <div className="flex items-start gap-2 text-muted-foreground pt-1">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{fullAddress}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* SECTION 4 — Mémo */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Mémo technicien</h2>
          {!editingMemo && (
            <Button variant="ghost" size="sm" onClick={() => setEditingMemo(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {installation.memo ? "Modifier" : "Ajouter"}
            </Button>
          )}
        </div>

        {editingMemo ? (
          <div className="space-y-3">
            <Textarea
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
              placeholder="Note utile pour le prochain passage…"
              rows={4}
              className="text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMemoDraft(installation.memo ?? "");
                  setEditingMemo(false);
                }}
                disabled={savingMemo}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveMemo} disabled={savingMemo}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {savingMemo ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        ) : installation.memo ? (
          <p className="text-sm whitespace-pre-wrap text-foreground">{installation.memo}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucun mémo enregistré.</p>
        )}
      </Card>

      {/* SECTION 5 — Historique */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ActivityIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Historique</h2>
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            Aucune activité enregistrée pour cette installation.
          </p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-sm">{activityLabel(a)}</span>
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {fmtDateTime(a.occurred_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
