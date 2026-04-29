import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

/* ── Normalisation badges ── */

function buildLineBadges(line: {
  product_kind: string | null;
  supplier_range: string | null;
  diameter_inner_mm: number | null;
  diameter_outer_mm: number | null;
  length_mm: number | null;
  angle_deg: number | null;
}): string[] {
  const badges: string[] = [];

  // Diamètre : Ø80/125 si double paroi, sinon Ø80
  if (line.diameter_inner_mm && line.diameter_outer_mm) {
    badges.push(`Ø${line.diameter_inner_mm}/${line.diameter_outer_mm}`);
  } else if (line.diameter_inner_mm) {
    badges.push(`Ø${line.diameter_inner_mm}`);
  } else if (line.diameter_outer_mm) {
    badges.push(`Ø${line.diameter_outer_mm}`);
  }

  // Angle (coude)
  if (line.angle_deg) {
    badges.push(`Coude ${line.angle_deg}°`);
  }

  // Longueur (tube)
  if (line.length_mm) {
    badges.push(`Tube ${line.length_mm}mm`);
  }

  // Gamme fournisseur
  if (line.supplier_range) {
    badges.push(line.supplier_range);
  }

  return badges;
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
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get("return_to");
  const returnTo = rawReturnTo?.startsWith("/") ? rawReturnTo : null;
  const { coreUser } = useCurrentUser();
  const {
    quote, lines, activities, project,
    depositInvoice, installation, technicalSurvey,
    sections, displayTotalHt, displayTotalTtc,
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
    if (!quote || !coreUser) {
      toast.error("Session non chargée, réessayez.");
      return;
    }
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
    navigate(returnTo ?? "/quotes");
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
        <Button variant="ghost" size="sm" onClick={() => navigate(returnTo ?? "/quotes")}>
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

  /* ── Garde-fous ── */
  const canSend = lines.length > 0 && displayTotalHt > 0;
  const isDesynced = lines.length === 0 && quote.total_ht > 0;

  /* ── Regroupement par sections ── */
  const linesBySection = new Map<string | null, typeof lines>();
  for (const l of lines) {
    const key = l.section_id ?? null;
    if (!linesBySection.has(key)) linesBySection.set(key, []);
    linesBySection.get(key)!.push(l);
  }
  const orphanLines = linesBySection.get(null) ?? [];

  /* ── Colonnes coût/marge (interne) ── */
  const itemLines = lines.filter((l) => l.line_type === "item");
  const showCostCols = itemLines.some((l) => (l.unit_cost_price ?? 0) > 0);
  const totalCost = itemLines.reduce(
    (s, l) => s + (l.unit_cost_price ?? 0) * l.qty,
    0,
  );
  const totalSale = itemLines.reduce((s, l) => s + l.total_line_ht, 0);
  const totalMarginEur = totalSale - totalCost;
  const totalMarginPct = totalSale > 0 ? (totalMarginEur / totalSale) * 100 : 0;
  const totalCols = 6 + (showCostCols ? 2 : 0);

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
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(returnTo ?? "/quotes")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Devis
      </Button>

      {/* ── Alerte désynchronisation totaux/lignes ── */}
      {isDesynced && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>
            Totaux désynchronisés — les lignes ont été supprimées. Rééditez le devis pour corriger.
          </AlertDescription>
        </Alert>
      )}

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
                <TooltipContent>
                  {!canSend
                    ? "Ajoutez au moins une ligne pour pouvoir dupliquer ce devis"
                    : "Disponible prochainement"}
                </TooltipContent>
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
              <div className="py-12 text-center border-2 border-dashed border-border rounded-lg mx-4">
                <p className="text-muted-foreground mb-4">
                  Ce devis ne contient aucune ligne
                </p>
                {quote.project_id && (
                  <Button
                    onClick={() =>
                      navigate(`/projects/${quote.project_id}/quotes/editor?quote_id=${quote.id}`)
                    }
                  >
                    Ajouter des lignes
                  </Button>
                )}
              </div>
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
                        {showCostCols && (
                          <>
                            <TableHead className="text-right w-[110px] text-xs text-muted-foreground">
                              Coût HT <span className="opacity-60">(interne)</span>
                            </TableHead>
                            <TableHead className="text-right w-[110px] text-xs text-muted-foreground">
                              Marge <span className="opacity-60">(interne)</span>
                            </TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sections.length > 0 ? (
                        <>
                          {sections.map((section) => {
                            const sectionLines = linesBySection.get(section.id) ?? [];
                            if (sectionLines.length === 0) return null;
                            const sectionTotal = sectionLines.reduce((s, l) => s + l.total_line_ht, 0);
                            return (
                              <>
                                <TableRow key={`sec-${section.id}`} className="bg-muted/40 hover:bg-muted/40">
                                  <TableCell colSpan={5} className="font-semibold text-sm py-2">
                                    {section.label}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold text-sm py-2">
                                    {fmt(sectionTotal)}
                                  </TableCell>
                                  {showCostCols && <TableCell colSpan={2} className="py-2" />}
                                </TableRow>
                                {sectionLines.map((line) => (
                                  <LineRow key={line.id} line={line} showCostCols={showCostCols} />
                                ))}
                              </>
                            );
                          })}
                          {orphanLines.length > 0 && (
                            <>
                              <TableRow key="sec-others" className="bg-muted/40 hover:bg-muted/40">
                                <TableCell colSpan={5} className="font-semibold text-sm py-2">
                                  Autres
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-sm py-2">
                                  {fmt(orphanLines.reduce((s, l) => s + l.total_line_ht, 0))}
                                </TableCell>
                                {showCostCols && <TableCell colSpan={2} className="py-2" />}
                              </TableRow>
                              {orphanLines.map((line) => (
                                <LineRow key={line.id} line={line} showCostCols={showCostCols} />
                              ))}
                            </>
                          )}
                        </>
                      ) : (
                        lines.map((line) => <LineRow key={line.id} line={line} showCostCols={showCostCols} />)
                      )}
                      {showCostCols && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5} className="text-right font-semibold text-xs text-muted-foreground py-2">
                            Marge totale (interne)
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                            {fmt(totalSale)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                            {fmt(totalCost)}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <MarginBadge pct={totalMarginPct} eur={totalMarginEur} />
                          </TableCell>
                        </TableRow>
                      )}
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
                <span className="font-mono font-medium">{fmt(displayTotalHt)}</span>
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
                <span className="font-mono font-bold text-lg">{fmt(displayTotalTtc)}</span>
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

          {/* ── BLOC 1 — ACTIONS ── */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</h3>
            <ActionsBloc
              quote={quote}
              project={project}
              depositInvoice={depositInvoice}
              expiry={expiry}
              transitioning={transitioning}
              signing={signing}
              canSend={canSend}
              onSend={() => transitionStatus("sent")}
              onSign={() => setShowSignConfirm(true)}
              onLost={() => transitionStatus("lost")}
              onEdit={() => navigate(`/projects/${quote.project_id}/quotes/editor?quote_id=${quote.id}`)}
              onDelete={() => setShowDelete(true)}
              navigate={navigate}
            />
          </Card>

          {/* ── BLOC 2 — ÉTAPE SUIVANTE ── */}
          <NextStepBloc kind={quote.quote_kind} status={quote.quote_status} />

          {/* ── BLOC 3 — RELEVÉ TECHNIQUE ── */}
          {!isService && (
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Relevé technique
              </h3>
              {technicalSurvey ? (
                <div className="space-y-2">
                  <p className="text-sm text-accent flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Relevé réalisé
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/technical-surveys/${technicalSurvey.id}`)}
                  >
                    Ouvrir le relevé
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Non réalisé</p>
                  {quote.project_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/technical-surveys/new?project_id=${quote.project_id}`)}
                    >
                      Créer un relevé
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ── BLOC 4 — ÉTAT DU DOSSIER ── */}
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
                      Créée ✔ <ExternalLink className="h-3 w-3" />
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
                      Créée ✔ <ExternalLink className="h-3 w-3" />
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
                  <span tabIndex={0} className="w-full">
                    <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                      <FileDown className="h-3.5 w-3.5 mr-2" />
                      Générer PDF
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!canSend
                    ? "Ajoutez au moins une ligne pour pouvoir générer le PDF"
                    : "Disponible prochainement"}
                </TooltipContent>
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
                  <span className="font-mono font-medium">{fmt(displayTotalHt)}</span>
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

/* ── Duplicate button (reusable) ── */
function DuplicateButton({ canSend = true }: { canSend?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="w-full">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Dupliquer
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {!canSend
          ? "Ajoutez au moins une ligne pour pouvoir dupliquer ce devis"
          : "Disponible prochainement"}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Line row (réutilisable, avec ou sans section) ── */
function LineRow({
  line,
  showCostCols,
}: {
  line: import("@/hooks/useQuoteDetail").QuoteLine;
  showCostCols: boolean;
}) {
  const isNote = line.line_type !== "item";
  const totalCols = 6 + (showCostCols ? 2 : 0);

  if (isNote) {
    return (
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell
          colSpan={totalCols}
          className="px-3 py-1.5 text-sm italic text-muted-foreground"
        >
          {line.label}
        </TableCell>
      </TableRow>
    );
  }

  // Niveau 1 — titre client
  const title =
    line.customer_label ??
    line.display_label ??
    line.normalized_label_snapshot ??
    line.label;

  // Niveau 2 — détails techniques (interne)
  const techParts: string[] = [];
  const supplierLine = [
    line.supplier_name_snapshot,
    line.supplier_sku_snapshot ?? line.supplier_ref_snapshot,
  ]
    .filter(Boolean)
    .join(" · ");
  if (supplierLine) techParts.push(supplierLine);

  if (line.diameter_inner_mm && line.diameter_outer_mm)
    techParts.push(`Ø${line.diameter_inner_mm}/${line.diameter_outer_mm}`);
  else if (line.diameter_inner_mm) techParts.push(`Ø${line.diameter_inner_mm}`);
  else if (line.diameter_outer_mm) techParts.push(`Ø${line.diameter_outer_mm}`);

  if (line.angle_deg) techParts.push(`${line.angle_deg}°`);
  if (line.length_mm) techParts.push(`${line.length_mm}mm`);
  if (line.supplier_range) techParts.push(`gamme : ${line.supplier_range}`);

  const hasTech =
    !!line.supplier_name_snapshot ||
    !!line.supplier_sku_snapshot ||
    !!line.supplier_ref_snapshot ||
    !!line.diameter_inner_mm ||
    !!line.diameter_outer_mm ||
    !!line.angle_deg ||
    !!line.length_mm ||
    !!line.supplier_range;

  // Coût / marge ligne
  const costLine = (line.unit_cost_price ?? 0) * line.qty;
  const marginEur = line.total_line_ht - costLine;
  const marginPct = line.total_line_ht > 0 ? (marginEur / line.total_line_ht) * 100 : 0;

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-sm">{title}</p>
        {hasTech && (
          <Collapsible>
            <CollapsibleTrigger className="mt-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
              Détails techniques
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 font-mono text-xs text-muted-foreground">
              {techParts.join(" · ")}
            </CollapsibleContent>
          </Collapsible>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">{line.qty}</TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">
        {line.unit ? UNIT_LABELS[line.unit] ?? line.unit : "—"}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">{fmt(line.unit_price_ht)}</TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">
        {line.vat_rate.toLocaleString("fr-FR")}%
      </TableCell>
      <TableCell className="text-right font-mono text-sm font-semibold">
        {fmt(line.total_line_ht)}
      </TableCell>
      {showCostCols && (
        <>
          <TableCell className="text-right font-mono text-xs text-muted-foreground">
            {(line.unit_cost_price ?? 0) > 0 ? fmt(costLine) : "—"}
          </TableCell>
          <TableCell className="text-right">
            {(line.unit_cost_price ?? 0) > 0 ? (
              <MarginBadge pct={marginPct} eur={marginEur} />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

/* ── Margin badge (interne) ── */
function MarginBadge({ pct, eur }: { pct: number; eur: number }) {
  const cls =
    pct >= 25
      ? "text-success"
      : pct >= 10
        ? "text-warning"
        : "text-destructive";
  return (
    <Badge variant="outline" className={`${cls} font-mono text-xs`}>
      {pct.toFixed(0)}% · {fmt(eur)}
    </Badge>
  );
}

/* ── Next Step Bloc ── */

function NextStepBloc({ kind, status }: { kind: string; status: string }) {
  let message: string | null = null;

  if (kind === "estimate" && status === "draft") message = "Étape suivante : envoyer le devis estimatif au client";
  else if (kind === "estimate" && status === "sent") message = "Étape suivante : réaliser le relevé technique puis créer le devis final";
  else if (kind === "final" && status === "draft") message = "Étape suivante : envoyer le devis final au client";
  else if (kind === "final" && status === "sent") message = "Étape suivante : obtenir la signature du client";
  else if (status === "signed") message = "Étape suivante : planifier l'intervention";
  else if (kind === "service" && status === "draft") message = "Étape suivante : envoyer le devis SAV";
  else if (kind === "service" && status === "sent") message = "Étape suivante : suivre la réponse du client";

  if (!message) return null;

  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <CircleDot className="h-3 w-3 text-primary shrink-0" />
        {message}
      </p>
    </Card>
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
  canSend: boolean;
  onSend: () => void;
  onSign: () => void;
  onLost: () => void;
  onEdit: () => void;
  onDelete: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

function ActionsBloc({
  quote, project, depositInvoice, expiry,
  transitioning, signing, canSend,
  onSend, onSign, onLost, onEdit, onDelete, navigate,
}: ActionsBlocProps) {
  const { quote_kind: kind, quote_status: status, project_id, service_request_id } = quote;
  const sendTooltip = "Ajoutez au moins une ligne pour pouvoir envoyer ce devis";
  const signTooltip = "Ajoutez au moins une ligne pour pouvoir signer ce devis";

  const SendBtn = () =>
    canSend ? (
      <Button size="sm" className="w-full" disabled={transitioning} onClick={onSend}>
        <Send className="h-3.5 w-3.5 mr-1" />
        Envoyer
      </Button>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="w-full">
            <Button size="sm" className="w-full" disabled>
              <Send className="h-3.5 w-3.5 mr-1" />
              Envoyer
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{sendTooltip}</TooltipContent>
      </Tooltip>
    );

  const SignBtn = () =>
    canSend ? (
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
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="w-full">
            <Button variant="success" size="sm" className="w-full" disabled>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Marquer comme signé
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{signTooltip}</TooltipContent>
      </Tooltip>
    );

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
            <SendBtn />
            <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Modifier
            </Button>
          </>
        )}
        <DuplicateButton canSend={canSend} />
      </div>
    );
  }

  /* CAS 1 — estimate + draft */
  if (kind === "estimate" && status === "draft") {
    return (
      <div className="space-y-2">
        <SendBtn />
        <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <DuplicateButton canSend={canSend} />
        <Button variant="outline" size="sm" className="w-full" disabled={transitioning} onClick={onLost}>
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Marquer perdu
        </Button>
      </div>
    );
  }

  /* CAS 3 — final + draft */
  if (kind === "final" && status === "draft") {
    return (
      <div className="space-y-2">
        <SendBtn />
        <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <DuplicateButton canSend={canSend} />
      </div>
    );
  }

  /* CAS 2b — estimate + sent + expiré */
  if (kind === "estimate" && status === "sent" && expiry.isExpired) {
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
            Recréer un devis estimatif
          </Button>
        )}
        <DuplicateButton canSend={canSend} />
        <Button variant="outline" size="sm" className="w-full" disabled={transitioning} onClick={onLost}>
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Marquer perdu
        </Button>
      </div>
    );
  }

  /* CAS 2 — estimate + sent + non expiré */
  if (kind === "estimate" && status === "sent") {
    return (
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-md bg-info/10 text-info px-3 py-1.5 text-xs font-medium text-center w-full justify-center">
          Devis estimatif — non signable
        </span>
        {project_id && (
          <Button size="sm" className="w-full" onClick={() => navigate(`/projects/${project_id}/quotes/new?kind=final&from_quote_id=${quote.id}`)}>
            Créer un devis final
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">Le devis final permettra d'engager le client</p>
        <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <DuplicateButton canSend={canSend} />
        <Button variant="outline" size="sm" className="w-full" disabled={transitioning} onClick={onLost}>
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Marquer perdu
        </Button>
      </div>
    );
  }

  /* CAS 4b — final + sent + expiré */
  if (kind === "final" && status === "sent" && expiry.isExpired) {
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
        <DuplicateButton canSend={canSend} />
      </div>
    );
  }

  /* CAS 4 — final + sent + non expiré */
  if (kind === "final" && status === "sent") {
    return (
      <div className="space-y-2">
        <SignBtn />
        <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <DuplicateButton canSend={canSend} />
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
        <DuplicateButton canSend={canSend} />
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
      <DuplicateButton canSend={canSend} />
    </div>
  );
}
