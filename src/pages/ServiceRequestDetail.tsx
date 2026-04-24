import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Mail,
  MessageSquare,
  MapPin,
  Voicemail,
  StickyNote,
  Loader2,
  Zap,
  Wrench,
  Calendar,
  Shield,
  Euro,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { operationsDb } from "@/integrations/supabase/schema-clients";
import { toTitleCase } from "@/lib/format";
import {
  useServiceRequestDetail,
  type ContactEvent,
  type ContactEventOutcome,
  type ContactEventType,
} from "@/hooks/useServiceRequestDetail";
import type {
  ServiceRequestCategory,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from "@/hooks/useServiceRequests";

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

const RESOLUTION_STYLES: Record<string, { label: string; cls: string }> = {
  phone_resolved: {
    label: "Réglé au téléphone",
    cls: "bg-success/10 text-success border-success/20",
  },
  intervention_needed: {
    label: "Intervention planifiée",
    cls: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  },
  no_action: {
    label: "Sans suite",
    cls: "bg-muted text-muted-foreground border-border",
  },
};

const EVENT_TYPE_LABEL: Record<ContactEventType, string> = {
  inbound_call: "Appel entrant",
  outbound_call: "Appel sortant",
  email_received: "Email reçu",
  email_sent: "Email envoyé",
  sms_sent: "SMS envoyé",
  visit: "Visite",
  voicemail: "Message vocal",
  internal_note: "Note interne",
};

const EVENT_TYPE_ICON: Record<ContactEventType, typeof Phone> = {
  inbound_call: PhoneIncoming,
  outbound_call: PhoneOutgoing,
  email_received: Mail,
  email_sent: Mail,
  sms_sent: MessageSquare,
  visit: MapPin,
  voicemail: Voicemail,
  internal_note: StickyNote,
};

const OUTCOME_LABEL: Record<ContactEventOutcome, string> = {
  resolved: "Résolu",
  callback_scheduled: "Rappel planifié",
  intervention_created: "Intervention créée",
  no_answer: "Pas de réponse",
  left_voicemail: "Message laissé",
  transferred: "Transféré",
  other: "Autre",
};

const EVENT_TYPE_OPTIONS: { value: ContactEventType; label: string }[] = [
  { value: "inbound_call", label: "Appel entrant" },
  { value: "outbound_call", label: "Appel sortant" },
  { value: "email_received", label: "Email reçu" },
  { value: "email_sent", label: "Email envoyé" },
  { value: "sms_sent", label: "SMS envoyé" },
  { value: "visit", label: "Visite" },
  { value: "voicemail", label: "Message vocal" },
  { value: "internal_note", label: "Note interne" },
];

const OUTCOME_OPTIONS: { value: ContactEventOutcome; label: string }[] = [
  { value: "resolved", label: "Résolu" },
  { value: "callback_scheduled", label: "Rappel planifié" },
  { value: "intervention_created", label: "Intervention créée" },
  { value: "no_answer", label: "Pas de réponse" },
  { value: "left_voicemail", label: "Message laissé" },
  { value: "other", label: "Autre" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function EventRow({ event }: { event: ContactEvent }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = EVENT_TYPE_ICON[event.event_type] ?? Phone;
  const label = EVENT_TYPE_LABEL[event.event_type] ?? event.event_type;
  const outcomeLabel = event.outcome ? OUTCOME_LABEL[event.outcome] : null;

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {outcomeLabel && (
            <Badge variant="outline" className="font-normal text-xs">
              {outcomeLabel}
            </Badge>
          )}
          {event.duration_seconds != null && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatDuration(event.duration_seconds)}
            </span>
          )}
        </div>
        {event.body && (
          <div>
            <p className={cn("text-sm text-muted-foreground", !expanded && "line-clamp-2")}>
              {event.body}
            </p>
            {event.body.length > 120 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline mt-0.5"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Voir moins" : "Voir plus"}
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground font-mono">
          {format(new Date(event.occurred_at), "d MMM yyyy à HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
}

export default function ServiceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useCurrentUser();
  const { request, events, loading, error, notFound, refetch } =
    useServiceRequestDetail(id);

  // Resolution dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  // Contact form
  const [eventType, setEventType] = useState<ContactEventType>("inbound_call");
  const [outcome, setOutcome] = useState<string>("none");
  const [duration, setDuration] = useState("");
  const [body, setBody] = useState("");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (notFound) {
      navigate("/service-requests", { replace: true });
    }
  }, [notFound, navigate]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground mb-1">
          Impossible de charger la demande SAV.
        </p>
        <p className="text-xs text-muted-foreground mb-4 font-mono">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (!request) return null;

  const prio = PRIORITY_STYLES[request.priority];
  const status = STATUS_STYLES[request.status];
  const cat = request.request_category ? CATEGORY_META[request.request_category] : null;
  const CatIcon = cat?.icon;
  const resolution = request.resolution_mode
    ? RESOLUTION_STYLES[request.resolution_mode]
    : null;
  const isResolved = request.status === "closed" || !!request.resolved_at;
  const deviceLine = [request.device_type, request.brand].filter(Boolean).join(" • ");
  const isCallEvent = eventType.endsWith("_call");

  async function handleResolve() {
    if (!resolutionNotes.trim()) {
      toast({
        title: "Notes obligatoires",
        description: "Décrivez la résolution avant de confirmer.",
        variant: "destructive",
      });
      return;
    }
    setResolving(true);
    const { error: err } = await operationsDb
      .from("service_requests")
      .update({
        resolution_mode: "phone_resolved",
        status: "closed",
        resolution_notes: resolutionNotes.trim(),
        resolved_at: new Date().toISOString(),
      })
      .eq("id", request!.id);
    setResolving(false);
    if (err) {
      toast({
        title: "Mise à jour impossible",
        description: err.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Demande clôturée" });
    setResolveOpen(false);
    setResolutionNotes("");
    refetch();
  }

  async function handleLogContact() {
    if (!body.trim()) {
      toast({
        title: "Notes obligatoires",
        description: "Ajoutez les notes de l'échange.",
        variant: "destructive",
      });
      return;
    }
    if (!tenantId) {
      toast({
        title: "Session non chargée",
        description: "Patientez avant d'enregistrer.",
        variant: "destructive",
      });
      return;
    }
    setLogging(true);
    const payload = {
      tenant_id: tenantId,
      service_request_id: request!.id,
      customer_id: request!.customer_id,
      event_type: eventType,
      outcome: outcome !== "none" ? outcome : null,
      duration_seconds: isCallEvent && duration ? Number(duration) : null,
      body: body.trim(),
      occurred_at: new Date().toISOString(),
    };
    const { error: err } = await operationsDb
      .from("contact_events")
      .insert(payload);
    setLogging(false);
    if (err) {
      toast({
        title: "Enregistrement impossible",
        description: err.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Contact enregistré" });
    setEventType("inbound_call");
    setOutcome("none");
    setDuration("");
    setBody("");
    refetch();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/service-requests")}
          className="mb-3 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Demandes SAV
        </Button>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className={cn("font-normal", prio.cls)}>
            {prio.label}
          </Badge>
          <Badge variant="outline" className={cn("font-normal", status.cls)}>
            {status.label}
          </Badge>
          {cat && CatIcon && (
            <Badge variant="outline" className="gap-1 font-normal">
              <CatIcon className="h-3 w-3" />
              {cat.label}
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {request.customer_name && (
            <button
              type="button"
              onClick={() => request.customer_id && navigate(`/clients/${request.customer_id}`)}
              className="text-xl font-bold tracking-tight hover:underline"
            >
              {toTitleCase(request.customer_name)}
            </button>
          )}
          {request.customer_phone && (
            <p className="text-sm text-muted-foreground font-mono">
              {request.customer_phone}
            </p>
          )}
          {request.installation_id && deviceLine && (
            <button
              type="button"
              onClick={() => navigate(`/installations/${request.installation_id}`)}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Wrench className="h-3 w-3" />
              {deviceLine}
            </button>
          )}
        </div>
      </div>

      {/* Problem & resolution */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold mb-2">Problème signalé</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {request.notes ?? "Aucune description fournie."}
          </p>
        </div>

        {isResolved && resolution && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("font-normal", resolution.cls)}>
                {resolution.label}
              </Badge>
              {request.resolved_at && (
                <span className="text-xs text-muted-foreground font-mono">
                  Clôturée le{" "}
                  {format(new Date(request.resolved_at), "d MMM yyyy à HH:mm", {
                    locale: fr,
                  })}
                </span>
              )}
            </div>
            {(request as any).resolution_notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {(request as any).resolution_notes}
              </p>
            )}
          </div>
        )}

        {!isResolved && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button size="sm" variant="success" onClick={() => setResolveOpen(true)}>
              <CheckCircle2 className="h-4 w-4" />
              Réglé au téléphone
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams({
                  service_request_id: request!.id,
                  return_to: `/service-requests/${request!.id}`,
                });
                if (request!.installation_id) {
                  params.set("installation_id", request!.installation_id);
                }
                navigate(`/interventions/new?${params.toString()}`);
              }}
            >
              <CalendarPlus className="h-4 w-4" />
              Planifier une intervention
            </Button>
          </div>
        )}
      </Card>

      {/* Log contact */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Enregistrer un contact</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tracez chaque échange avec le client.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type d'événement</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as ContactEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Issue (facultatif)</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isCallEvent && (
          <div className="space-y-2">
            <Label>Durée (secondes)</Label>
            <Input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="180"
              className="max-w-[160px]"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Notes de l'échange</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Résumé de l'échange…"
            rows={3}
            maxLength={2000}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleLogContact} disabled={logging || !tenantId}>
            {logging && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer le contact
          </Button>
        </div>
      </Card>

      {/* History */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Historique</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {events.length}
          </Badge>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucun contact enregistré pour cette demande.
          </p>
        ) : (
          <div className="divide-y">
            {events.map((evt) => (
              <EventRow key={evt.id} event={evt} />
            ))}
          </div>
        )}
      </Card>

      {/* Resolution dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer la demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes de résolution <span className="text-destructive">*</span></Label>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Décrivez la résolution apportée au téléphone…"
              rows={4}
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveOpen(false)}
              disabled={resolving}
            >
              Annuler
            </Button>
            <Button
              variant="success"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
