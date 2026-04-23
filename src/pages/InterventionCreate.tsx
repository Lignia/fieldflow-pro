import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, X, Loader2, FolderKanban, Wrench, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { coreDb, operationsDb } from "@/integrations/supabase/schema-clients";
import { toTitleCase } from "@/lib/format";
import type {
  InterventionType,
  InterventionWorkstream,
} from "@/hooks/useInterventions";

const PROJECT_TYPE_OPTIONS: { value: InterventionType; label: string }[] = [
  { value: "technical_survey", label: "Visite technique" },
  { value: "installation", label: "Pose" },
  { value: "commissioning", label: "Mise en service" },
  { value: "commercial_visit", label: "Visite commerciale" },
];

const AFTERCARE_TYPE_OPTIONS: { value: InterventionType; label: string }[] = [
  { value: "sweep", label: "Ramonage" },
  { value: "annual_service", label: "Entretien annuel" },
  { value: "repair", label: "Dépannage" },
  { value: "diagnostic", label: "Diagnostic" },
];

const SWEEP_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "simple", label: "Conduit simple" },
  { value: "double", label: "Conduit double" },
  { value: "tubing", label: "Tubage" },
  { value: "desooting", label: "Débistrage" },
];

const FLUE_CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: "good", label: "Bon" },
  { value: "average", label: "Moyen" },
  { value: "poor", label: "Mauvais" },
  { value: "critical", label: "Critique — urgent" },
];

const PROJECT_TYPES: InterventionType[] = [
  "technical_survey",
  "installation",
  "commissioning",
  "commercial_visit",
];

function workstreamFor(type: InterventionType): InterventionWorkstream {
  return PROJECT_TYPES.includes(type) ? "project_installation" : "aftercare_service";
}

interface CustomerLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  name: string | null;
  phone: string | null;
}

interface UserLite {
  id: string;
  full_name: string | null;
  role: string | null;
}

interface ContextLink {
  kind: "project" | "installation" | "service_request";
  id: string;
  label: string;
  href: string;
}

function customerDisplay(c: CustomerLite): string {
  if (c.company_name) return toTitleCase(c.company_name);
  const parts = [c.first_name, c.last_name].filter(Boolean).join(" ");
  if (parts) return toTitleCase(parts);
  return c.name ? toTitleCase(c.name) : "Client";
}

function formatDuration(start: string, end: string): string | null {
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

export default function InterventionCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { tenantId } = useCurrentUser();

  const qpType = searchParams.get("type") as InterventionType | null;
  const qpProjectId = searchParams.get("project_id");
  const qpInstallationId = searchParams.get("installation_id");
  const qpServiceRequestId = searchParams.get("service_request_id");

  // Form state
  const [type, setType] = useState<InterventionType>(qpType ?? "sweep");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [internalNotes, setInternalNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Champs conditionnels selon le type
  const [sweepType, setSweepType] = useState<string>("");
  const [flueCondition, setFlueCondition] = useState<string>("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [nextServiceRecommendation, setNextServiceRecommendation] = useState("");

  // Suivi
  const [followupNeeded, setFollowupNeeded] = useState(false);
  const [followupNotes, setFollowupNotes] = useState("");
  const [quoteNeeded, setQuoteNeeded] = useState(false);

  // Context
  const [contextLoading, setContextLoading] = useState(
    !!(qpProjectId || qpInstallationId || qpServiceRequestId),
  );
  const [contextLinks, setContextLinks] = useState<ContextLink[]>([]);
  const [contextProjectId, setContextProjectId] = useState<string | null>(qpProjectId);
  const [contextInstallationId, setContextInstallationId] =
    useState<string | null>(qpInstallationId);
  const [contextServiceRequestId, setContextServiceRequestId] =
    useState<string | null>(qpServiceRequestId);
  const [contextPropertyId, setContextPropertyId] = useState<string | null>(null);

  // Customer (selected via search OR pre-filled from context)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLite | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerLite[]>([]);

  // Users
  const [users, setUsers] = useState<UserLite[]>([]);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Load active users
  useEffect(() => {
    coreDb
      .from("users")
      .select("id, full_name, role")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => {
        setUsers((data ?? []) as UserLite[]);
      });
  }, []);

  // Pre-fill from query params
  useEffect(() => {
    if (!qpProjectId && !qpInstallationId && !qpServiceRequestId) return;
    let cancelled = false;
    (async () => {
      setContextLoading(true);
      const links: ContextLink[] = [];
      let customerId: string | null = null;
      let customerName: string | null = null;
      let propertyId: string | null = null;

      if (qpProjectId) {
        const { data } = await coreDb
          .from("v_projects_with_customer")
          .select(
            "id, project_number, customer_id, customer_name, property_id, address_line1, city",
          )
          .eq("id", qpProjectId)
          .maybeSingle();
        if (data) {
          links.push({
            kind: "project",
            id: data.id,
            label: `Projet ${data.project_number ?? ""}`.trim(),
            href: `/projects/${data.id}`,
          });
          customerId = data.customer_id ?? customerId;
          customerName = data.customer_name ?? customerName;
          propertyId = data.property_id ?? propertyId;
        }
      }

      if (qpInstallationId) {
        const { data } = await coreDb
          .from("v_installations_with_customer")
          .select(
            "id, device_type, brand, customer_id, customer_name, property_id, address_line1, city",
          )
          .eq("id", qpInstallationId)
          .maybeSingle();
        if (data) {
          const lbl = [data.device_type, data.brand].filter(Boolean).join(" ");
          links.push({
            kind: "installation",
            id: data.id,
            label: lbl || "Installation",
            href: `/installations/${data.id}`,
          });
          customerId = customerId ?? data.customer_id;
          customerName = customerName ?? data.customer_name;
          propertyId = propertyId ?? data.property_id;
        }
      }

      if (qpServiceRequestId) {
        const { data } = await operationsDb
          .from("v_service_requests_with_context")
          .select(
            "id, customer_id, customer_name, installation_id, property_id, address_line1, city, request_category",
          )
          .eq("id", qpServiceRequestId)
          .maybeSingle();
        if (data) {
          links.push({
            kind: "service_request",
            id: data.id,
            label: "Demande SAV",
            href: `/service-requests/${data.id}`,
          });
          customerId = customerId ?? data.customer_id;
          customerName = customerName ?? data.customer_name;
          propertyId = propertyId ?? data.property_id;
          if (!contextInstallationId && data.installation_id) {
            setContextInstallationId(data.installation_id);
          }
        }
      }

      if (cancelled) return;

      setContextLinks(links);
      setContextPropertyId(propertyId);
      if (customerId) {
        // Fetch customer details
        const { data: cust } = await coreDb
          .from("customers")
          .select("id, first_name, last_name, company_name, name, phone")
          .eq("id", customerId)
          .maybeSingle();
        if (!cancelled && cust) {
          setSelectedCustomer(cust as CustomerLite);
        } else if (!cancelled && customerName) {
          setSelectedCustomer({
            id: customerId,
            first_name: null,
            last_name: customerName,
            company_name: null,
            name: customerName,
            phone: null,
          });
        }
      }
      setContextLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpProjectId, qpInstallationId, qpServiceRequestId]);

  // Debounced customer search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(customerSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    if (!debounced || debounced.length < 2 || selectedCustomer) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const term = `%${debounced}%`;
    coreDb
      .from("customers")
      .select("id, first_name, last_name, company_name, name, phone")
      .or(
        `last_name.ilike.${term},company_name.ilike.${term},name.ilike.${term}`,
      )
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return;
        setResults((data ?? []) as CustomerLite[]);
        setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, selectedCustomer]);

  const duration = useMemo(() => formatDuration(startAt, endAt), [startAt, endAt]);
  const datesValid =
    startAt && endAt && new Date(endAt).getTime() > new Date(startAt).getTime();

  const canSubmit =
    !!tenantId &&
    !!type &&
    !!selectedCustomer &&
    !!datesValid &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !selectedCustomer || !tenantId) return;
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      intervention_type: type,
      workstream: workstreamFor(type),
      status: "planned",
      customer_id: selectedCustomer.id,
      property_id: contextPropertyId,
      project_id: contextProjectId,
      installation_id: contextInstallationId,
      service_request_id: contextServiceRequestId,
      start_datetime: new Date(startAt).toISOString(),
      end_datetime: new Date(endAt).toISOString(),
      internal_notes: internalNotes.trim() || null,
      customer_visible_notes: customerNotes.trim() || null,
      followup_needed: followupNeeded,
      followup_notes: followupNeeded ? followupNotes.trim() || null : null,
      quote_needed: quoteNeeded,
      sweep_type: type === "sweep" && sweepType ? sweepType : null,
      flue_condition: type === "sweep" && flueCondition ? flueCondition : null,
      parts_replaced:
        type === "annual_service" && partsReplaced.trim()
          ? partsReplaced.trim()
          : null,
      next_service_recommendation:
        type === "annual_service" && nextServiceRecommendation.trim()
          ? nextServiceRecommendation.trim()
          : null,
    };
    if (assignedTo !== "none") {
      payload.assigned_to = assignedTo;
    }

    const { data, error } = await operationsDb
      .from("interventions")
      .insert(payload)
      .select("id")
      .single();

    setSubmitting(false);

    if (error || !data) {
      toast({
        title: "Erreur de création",
        description: error?.message ?? "Impossible de créer l'intervention.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Intervention créée" });
    navigate(`/interventions/${data.id}`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/interventions")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Nouvelle intervention
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifier une intervention pour un client
          </p>
        </div>
      </div>

      {/* Context badges */}
      {contextLoading ? (
        <Card className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du contexte…
        </Card>
      ) : contextLinks.length > 0 ? (
        <Card className="p-3 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">
            Contexte lié :
          </span>
          {contextLinks.map((l) => (
            <Badge
              key={l.kind}
              variant="outline"
              className="gap-1 cursor-pointer hover:bg-accent"
              onClick={() => navigate(l.href)}
            >
              {l.kind === "project" && <FolderKanban className="h-3 w-3" />}
              {l.kind === "installation" && <Wrench className="h-3 w-3" />}
              {l.kind === "service_request" && <AlertCircle className="h-3 w-3" />}
              {l.label}
            </Badge>
          ))}
        </Card>
      ) : null}

      <Card className="p-6 space-y-5">
        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="type">
            Type d'intervention <span className="text-destructive">*</span>
          </Label>
          <Select value={type} onValueChange={(v) => setType(v as InterventionType)}>
            <SelectTrigger id="type" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Projet</SelectLabel>
                {PROJECT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>SAV & Récurrent</SelectLabel>
                {AFTERCARE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Customer */}
        <div className="space-y-2">
          <Label>
            Client <span className="text-destructive">*</span>
          </Label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{customerDisplay(selectedCustomer)}</p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
              {!qpProjectId && !qpInstallationId && !qpServiceRequestId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Rechercher par nom ou société…"
                className="pl-9 h-9"
              />
              {(searching || results.length > 0) && (
                <Card className="absolute z-10 mt-1 w-full max-h-64 overflow-auto p-1">
                  {searching && (
                    <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Recherche…
                    </div>
                  )}
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setResults([]);
                        setCustomerSearch("");
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm"
                    >
                      <div className="font-medium">{customerDisplay(c)}</div>
                      {c.phone && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {c.phone}
                        </div>
                      )}
                    </button>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Start / End */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start">
              Début <span className="text-destructive">*</span>
            </Label>
            <Input
              id="start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">
              Fin <span className="text-destructive">*</span>
            </Label>
            <Input
              id="end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        {duration && (
          <p className="text-xs text-muted-foreground -mt-2">
            Durée : <span className="font-mono">{duration}</span>
          </p>
        )}
        {startAt && endAt && !datesValid && (
          <p className="text-xs text-destructive -mt-2">
            La date de fin doit être après la date de début.
          </p>
        )}

        {/* Assigned to */}
        <div className="space-y-2">
          <Label htmlFor="assigned">Technicien assigné</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger id="assigned" className="h-9">
              <SelectValue placeholder="Non assigné" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non assigné</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ? toTitleCase(u.full_name) : "Sans nom"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="internal">Notes internes</Label>
          <Textarea
            id="internal"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Notes pour l'équipe…"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer">Message visible par le client</Label>
          <Textarea
            id="customer"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Informations transmises au client…"
            rows={3}
          />
        </div>

        {/* Champs spécifiques ramonage */}
        {type === "sweep" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="sweep-type">Type de ramonage</Label>
              <Select value={sweepType} onValueChange={setSweepType}>
                <SelectTrigger id="sweep-type" className="h-9">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {SWEEP_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flue-condition">État du conduit</Label>
              <Select value={flueCondition} onValueChange={setFlueCondition}>
                <SelectTrigger id="flue-condition" className="h-9">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {FLUE_CONDITION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Champs spécifiques entretien annuel */}
        {type === "annual_service" && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="parts">Pièces remplacées</Label>
              <Textarea
                id="parts"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                placeholder="Ex: Joint vitre, allumeur céramique…"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reco">Recommandations</Label>
              <Textarea
                id="reco"
                value={nextServiceRecommendation}
                onChange={(e) => setNextServiceRecommendation(e.target.value)}
                placeholder="Recommandations pour le prochain entretien…"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Suivi */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="followup">Prévoir une autre intervention</Label>
              <p className="text-xs text-muted-foreground">
                Une suite est nécessaire (retour, contrôle, etc.)
              </p>
            </div>
            <Switch
              id="followup"
              checked={followupNeeded}
              onCheckedChange={setFollowupNeeded}
            />
          </div>
          {followupNeeded && (
            <Textarea
              value={followupNotes}
              onChange={(e) => setFollowupNotes(e.target.value)}
              placeholder="Décrire la suite à donner…"
              rows={2}
            />
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="quote">Devis à établir</Label>
              <p className="text-xs text-muted-foreground">
                Un devis sera nécessaire suite à cette intervention
              </p>
            </div>
            <Switch
              id="quote"
              checked={quoteNeeded}
              onCheckedChange={setQuoteNeeded}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/interventions")}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer l'intervention
        </Button>
      </div>
    </div>
  );
}
