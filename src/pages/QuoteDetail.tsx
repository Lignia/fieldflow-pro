import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  FileDown,
  Receipt,
  History,
  FolderOpen,
  ExternalLink,
  MapPinned,
  FileText,
  TrendingUp,
  StickyNote,
  CircleDot,
  Wrench,
  Copy,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { billingDb } from "@/integrations/supabase/schema-clients";
import { useQuoteDetail, UNIT_LABELS, type QuoteActivity } from "@/hooks/useQuoteDetail";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSignQuote } from "@/hooks/useSignQuote";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ── Helpers ── */

function fmt(amount: number): string {
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtDate(d: string): string {
  return format(new Date(d), "d MMM yyyy", { locale: fr });
}

function fmtDateFull(d: string): string {
  return format(new Date(d), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
}

/* ── Status / Kind config ── */

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:    { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  sent:     { label: "Envoyé",    className: "bg-info/15 text-info" },
  signed:   { label: "Signé",     className: "bg-accent/15 text-accent" },
  lost:     { label: "Perdu",     className: "bg-destructive/15 text-destructive" },
  expired:  { label: "Expiré",    className: "bg-warning/15 text-warning" },
  canceled: { label: "Annulé",    className: "bg-muted text-muted-foreground" },
};

const KIND_CONFIG: Record<string, { label: string; className: string }> = {
  estimate: { label: "Estimatif", className: "bg-info/15 text-info" },
  final:    { label: "Définitif", className: "bg-accent/15 text-accent" },
  service:  { label: "SAV",       className: "bg-warning/15 text-warning" },
};

/* ── Activity mapping ── */

function activityLabel(a: QuoteActivity): string {
  const p = a.payload as any;
  switch (a.activity_type) {
    case "wf_status_change": {
      const from = STATUS_CONFIG[p?.from_status]?.label ?? p?.from_status ?? "—";
      const to = STATUS_CONFIG[p?.to_status]?.label ?? p?.to_status ?? "—";
      return `Statut : ${from} → ${to}`;
    }
    case "wf_quote_sent":
      return "Devis envoyé au client";
    default:
      return a.activity_type;
  }
}

/* ── Expiry helpers ── */

function getExpiryInfo(expiryDate: string, status: string) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const days = differenceInDays(expiry, now);
  const isExpired = days < 0 && status === "sent";
  const isExpiringSoon = days >= 0 && days <= 7 && status === "sent";
  return { days, isExpired, isExpiringSoon };
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const {
    quote, lines, activities, project,
    depositInvoice, installation, technicalSurvey,
    loading, error, refetch,
  } = useQuoteDetail(id);
  const [showDelete, setShowDelete] = useState(false);
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const { signQuote, signing, error: signError } = useSignQuote();

  if (error && !loading) {
    toast.error(error, { id: "quote-detail-error" });
  }

  /* ── Status transition ── */
  async function transitionStatus(newStatus: string) {
    if (!quote || !coreUser) return;
    setTransitioning(true);
    try {
      const { error: rpcErr } = await billingDb.rpc("transition_quote_status", {
        p_quote_id: quote.id,
        p_new_status: newStatus,
        p_actor_id: coreUser.id,
        p_reason: newStatus === "sent" ? "Devis envoyé au client" : undefined,
      });
      if (rpcErr) throw rpcErr;
      toast.success(
        newStatus === "sent" ? "Devis envoyé" :
        newStatus === "signed" ? "Devis marqué comme signé" :
        newStatus === "lost" ? "Devis marqué comme perdu" :
        "Statut mis à jour"
      );
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de la transition");
    } finally {
      setTransitioning(false);
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!quote) return;
    const { error: delErr } = await billingDb.from("quotes").delete().eq("id", quote.id);
    if (delErr) {
      toast.error(delErr.message);
      return;
    }
    toast.success("Devis supprimé");
    navigate("/quotes");
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!quote) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Devis
        </Button>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Devis introuvable</p>
        </Card>
      </div>
    );
  }

  const { customer, property } = quote;
  const statusCfg = STATUS_CONFIG[quote.quote_status] ?? STATUS_CONFIG.draft;
  const kindCfg = KIND_CONFIG[quote.quote_kind] ?? KIND_CONFIG.estimate;
  const expiry = getExpiryInfo(quote.expiry_date, quote.quote_status);
  const isService = quote.quote_kind === "service";

  /* ── VAT breakdown ── */
  const vatGroups = lines.reduce<Record<number, number>>((acc, l) => {
    if (!acc[l.vat_rate]) acc[l.vat_rate] = 0;
    acc[l.vat_rate] += l.total_line_ht * (l.vat_rate / 100);
    return acc;
  }, {});

  /* ── Google Maps link ── */
  const mapsUrl = property
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [property.address_line1, property.postal_code, property.city].filter(Boolean).join(", ")
      )}`
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* ── Dialogs ── */}
      <DeleteDialog open={showDelete} onOpenChange={setShowDelete} onConfirm={handleDelete} />
      <SignDialog
        open={showSignConfirm}
        onOpenChange={setShowSignConfirm}
        signing={signing}
        onConfirm={async () => {
          const result = await signQuote(quote.id);
          if (result) {
            toast.success(`Devis signé — facture d'acompte ${result.invoice_number} créée`);
            setShowSignConfirm(false);
            refetch();
          } else {
            toast.error(signError ?? "Erreur lors de la signature");
          }
        }}
      />

      {/* ── Back nav ── */}
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/quotes")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Devis
      </Button>

      {/* ══ 2-COLUMN LAYOUT ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══════════════════════════════════
            LEFT COLUMN — Content
            ══════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Contextual header ── */}
          <Card className="p-5 space-y-4">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight font-mono">
                    {quote.quote_number}
                  </h1>
                  {quote.version_number > 1 && (
                    <span className="text-sm text-muted-foreground font-mono">v{quote.version_number}</span>
                  )}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${kindCfg.className}`}>
                    {kindCfg.label}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                  {/* Expiry badges — only positive days or "Expiré" */}
                  {expiry.isExpired && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/15 text-destructive">
                      Expiré
                    </span>
                  )}
                  {expiry.isExpiringSoon && expiry.days >= 0 && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning/15 text-warning">
                      Expire dans {expiry.days} jour{expiry.days !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Origin mention */}
                {quote.previous_quote_id && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    Issu d'un devis estimatif
                  </p>
                )}

                {/* Signed date — only if non-null */}
                {quote.signed_at && (
                  <p className="text-sm text-accent flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Signé le {fmtDate(quote.signed_at)}
                  </p>
                )}
              </div>

              {/* Duplicate button (disabled placeholder) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="outline" size="sm" disabled>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Dupliquer
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Disponible prochainement</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            {/* Context links row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {/* Client */}
              {customer && (
                <button
                  onClick={() => navigate(`/clients/${customer.id}`)}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <User className="h-3.5 w-3.5" />
                  {customer.name}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </button>
              )}

              {/* Project — only for non-service */}
              {project && !isService && (
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  {project.project_number}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </button>
              )}

              {/* SAV link — only for service with service_request_id */}
              {isService && quote.service_request_id && (
                <button
                  onClick={() => navigate(`/service-requests/${quote.service_request_id}`)}
                  className="flex items-center gap-1.5 text-warning hover:underline"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Voir la demande SAV
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </button>
              )}

              {/* Address — label: "Adresse d'intervention" */}
              {property && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {[property.address_line1, property.city].filter(Boolean).join(", ")}
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                      title="Ouvrir dans Maps"
                    >
                      <MapPinned className="h-3.5 w-3.5 inline" />
                    </a>
                  )}
                </span>
              )}
            </div>

            {/* Dates row — conditional display */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Émis le {fmtDate(quote.quote_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Valide jusqu'au {fmtDate(quote.expiry_date)}
              </span>
              {/* sent_at — only if non-null */}
              {quote.sent_at && (
                <span className="flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  Envoyé le {fmtDate(quote.sent_at)}
                </span>
              )}
              {/* signed_at — already shown above, but also in date row for consistency */}
              {quote.signed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Signé le {fmtDate(quote.signed_at)}
                </span>
              )}
            </div>
          </Card>

          {/* ── Lines table ── */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold">
              Lignes du devis
              <span className="text-muted-foreground font-normal ml-2 text-sm">({lines.length})</span>
            </h2>

            {lines.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Aucune ligne</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[220px]">Désignation</TableHead>
                        <TableHead className="text-right w-[80px]">Qté</TableHead>
                        <TableHead className="text-right w-[80px]">Unité</TableHead>
                        <TableHead className="text-right w-[110px]">Prix HT</TableHead>
                        <TableHead className="text-right w-[70px]">TVA</TableHead>
                        <TableHead className="text-right w-[120px]">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{line.label}</p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{line.qty}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {line.unit ? UNIT_LABELS[line.unit] ?? line.unit : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(line.unit_price_ht)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {line.vat_rate.toLocaleString("fr-FR")}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(line.total_line_ht)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>

          {/* ── Totals ── */}
          <Card className="p-6">
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex items-center justify-between w-full max-w-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-mono font-medium">{fmt(quote.total_ht)}</span>
              </div>
              {Object.entries(vatGroups)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rate, vatAmount]) => (
                  <div key={rate} className="flex items-center justify-between w-full max-w-sm">
                    <span className="text-muted-foreground">TVA {Number(rate).toLocaleString("fr-FR")}%</span>
                    <span className="font-mono text-sm">{fmt(vatAmount)}</span>
                  </div>
                ))}
              <Separator className="my-1 max-w-sm w-full" />
              <div className="flex items-center justify-between w-full max-w-sm">
                <span className="font-semibold text-base">Total TTC</span>
                <span className="font-mono font-bold text-lg">{fmt(quote.total_ttc)}</span>
              </div>
            </div>
          </Card>

          {/* ── Activity timeline ── */}
          {activities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Historique</h2>
              </div>
              <Card className="p-5">
                <div className="relative space-y-0">
                  {activities.map((activity, idx) => (
                    <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
                      {idx < activities.length - 1 && (
                        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                      )}
                      <div className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-border bg-background" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{activityLabel(activity)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDateFull(activity.occurred_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════
            RIGHT COLUMN — Sticky sidebar
            ══════════════════════════════════ */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">

          {/* ── BLOC ACTIONS ── */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</h3>
            <ActionsBloc
              quote={quote}
              project={project}
              depositInvoice={depositInvoice}
              expiry={expiry}
              transitioning={transitioning}
              signing={signing}
              onSend={() => transitionStatus("sent")}
              onSign={() => setShowSignConfirm(true)}
              onLost={() => transitionStatus("lost")}
              onEdit={() => navigate(`/projects/${quote.project_id}/quotes/new`)}
              onDelete={() => setShowDelete(true)}
              navigate={navigate}
            />
          </Card>

          {/* ── BLOC ÉTAT DU DOSSIER ── */}
          {!isService && (
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">État du dossier</h3>
              <div className="space-y-2">
                {/* Invoice status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" />
                    Facture acompte
                  </span>
                  {depositInvoice ? (
                    <button
                      onClick={() => navigate(`/invoices/${depositInvoice.id}`)}
                      className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                    >
                      Créée <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Non créée</span>
                  )}
                </div>
                {/* Installation status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    Installation
                  </span>
                  {installation ? (
                    <button
                      onClick={() => navigate(`/installations/${installation.id}`)}
                      className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                    >
                      Créée <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Non créée</span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── BLOC DOCUMENTS ── */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</h3>
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                    <FileDown className="h-3.5 w-3.5 mr-2" />
                    Générer PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Disponible prochainement</TooltipContent>
              </Tooltip>
              {depositInvoice && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate(`/invoices/${depositInvoice.id}`)}
                >
                  <Receipt className="h-3.5 w-3.5 mr-2" />
                  {depositInvoice.invoice_number}
                </Button>
              )}
            </div>
          </Card>

          {/* ── BLOC RENTABILITÉ ── */}
          {!isService && (
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Rentabilité
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-mono font-medium">{fmt(quote.total_ht)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coût estimé</span>
                  <span className="text-muted-foreground italic text-xs">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marge</span>
                  <span className="text-muted-foreground italic text-xs">—</span>
                </div>
              </div>
            </Card>
          )}

          {/* ── BLOC NOTES ── */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </h3>
            <Textarea
              placeholder="Ajouter une note…"
              className="min-h-[80px] text-sm"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════ */

function DeleteDialog({ open, onOpenChange, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le devis brouillon sera définitivement supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SignDialog({ open, onOpenChange, signing, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signing: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la signature</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Le client a signé ce devis.</p>
              <p>Cette action va créer automatiquement :</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>une facture d'acompte (30%)</li>
                <li>une installation à compléter</li>
              </ul>
              <p>Le client sera converti en client actif.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={signing}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={signing}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {signing ? "Signature en cours…" : "Confirmer la signature"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ── Actions bloc (right sidebar) ── */

interface ActionsBlocProps {
  quote: NonNullable<ReturnType<typeof useQuoteDetail>["quote"]>;
  project: ReturnType<typeof useQuoteDetail>["project"];
  depositInvoice: ReturnType<typeof useQuoteDetail>["depositInvoice"];
  expiry: ReturnType<typeof getExpiryInfo>;
  transitioning: boolean;
  signing: boolean;
  onSend: () => void;
  onSign: () => void;
  onLost: () => void;
  onEdit: () => void;
  onDelete: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

function ActionsBloc({
  quote, project, depositInvoice, expiry,
  transitioning, signing,
  onSend, onSign, onLost, onEdit, onDelete, navigate,
}: ActionsBlocProps) {
  const { quote_kind: kind, quote_status: status, project_id, service_request_id } = quote;

  /* CAS 6 — Service / SAV */
  if (kind === "service") {
    return (
      <div className="space-y-2">
        <Badge variant="secondary" className="w-full justify-center py-1">Devis SAV</Badge>
        {service_request_id && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate(`/service-requests/${service_request_id}`)}
          >
            Voir la demande SAV
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
        {status === "draft" && (
          <>
            <Button size="sm" className="w-full" disabled={transitioning} onClick={onSend}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Envoyer
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Modifier
            </Button>
          </>
        )}
      </div>
    );
  }

  /* CAS 1 — estimate/final + draft */
  if (status === "draft") {
    return (
      <div className="space-y-2">
        <Button size="sm" className="w-full" disabled={transitioning} onClick={onSend}>
          <Send className="h-3.5 w-3.5 mr-1" />
          Envoyer
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Supprimer
        </Button>
      </div>
    );
  }

  /* CAS 2/2b — estimate + sent */
  if (kind === "estimate" && status === "sent") {
    if (expiry.isExpired) {
      return (
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-destructive/15 text-destructive w-full justify-center">
            Expiré
          </span>
          {project_id && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => navigate(`/projects/${project_id}/quotes/new?kind=estimate`)}
            >
              Créer un nouveau devis
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-md bg-info/10 text-info px-3 py-1.5 text-xs font-medium text-center">
          Devis estimatif — non signable
        </span>
        {project_id && (
          <Button size="sm" className="w-full" onClick={() => navigate(`/projects/${project_id}/quotes/new?kind=final`)}>
            Créer un devis final
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">Le devis final permettra d'engager le client</p>
        <Button variant="outline" size="sm" className="w-full" disabled={transitioning} onClick={onLost}>
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Marquer perdu
        </Button>
      </div>
    );
  }

  /* CAS 4/4b — final + sent */
  if (kind === "final" && status === "sent") {
    if (expiry.isExpired) {
      return (
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-destructive/15 text-destructive w-full justify-center">
            Expiré
          </span>
          {project_id && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => navigate(`/projects/${project_id}/quotes/new?kind=final`)}
            >
              Recréer un devis final
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Button
          variant="success"
          size="sm"
          className="w-full"
          disabled={transitioning || signing}
          onClick={onSign}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Marquer comme signé
        </Button>
        <Button variant="outline" size="sm" className="w-full" disabled={transitioning} onClick={onLost}>
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Marquer perdu
        </Button>
      </div>
    );
  }

  /* CAS 5 — signed */
  if (status === "signed") {
    return (
      <div className="space-y-2">
        {depositInvoice ? (
          <Button size="sm" className="w-full" onClick={() => navigate(`/invoices/${depositInvoice.id}`)}>
            <Receipt className="h-3.5 w-3.5 mr-1" />
            Voir la facture d'acompte
          </Button>
        ) : (
          <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs">
            Facture en cours de génération
          </Badge>
        )}
        {project_id && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/projects/${project_id}`)}>
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Ouvrir le projet
          </Button>
        )}
      </div>
    );
  }

  /* CAS lost / canceled — neutral */
  return (
    <div className="space-y-2">
      <Badge variant="secondary" className="w-full justify-center py-1">
        {STATUS_CONFIG[status]?.label ?? status}
      </Badge>
      {project_id && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/projects/${project_id}`)}>
          <FolderOpen className="h-3.5 w-3.5 mr-1" />
          Ouvrir le projet
        </Button>
      )}
    </div>
  );
}
