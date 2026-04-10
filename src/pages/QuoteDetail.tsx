import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

function fmtRound(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function fmtDate(d: string): string {
  return format(new Date(d), "d MMM yyyy", { locale: fr });
}

function fmtDateFull(d: string): string {
  return format(new Date(d), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
}

/* ── Status config ── */

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
      return `Statut changé : ${from} → ${to}`;
    }
    case "wf_quote_sent":
      return "Devis envoyé au client";
    default:
      return a.activity_type;
  }
}

/* ── Main component ── */

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const { quote, lines, activities, project, depositInvoice, loading, error, refetch } = useQuoteDetail(id);
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

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  /* ── Not found ── */
  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
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

  /* ── VAT breakdown (frontend calc for detail only) ── */
  const vatGroups = lines.reduce<Record<number, number>>((acc, l) => {
    if (!acc[l.vat_rate]) acc[l.vat_rate] = 0;
    acc[l.vat_rate] += l.total_line_ht * (l.vat_rate / 100);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Delete confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis brouillon sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign confirmation */}
      <AlertDialog open={showSignConfirm} onOpenChange={setShowSignConfirm}>
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
              onClick={async (e) => {
                e.preventDefault();
                const result = await signQuote(quote!.id);
                if (result) {
                  toast.success(`Devis signé — facture d'acompte ${result.invoice_number} créée`);
                  setShowSignConfirm(false);
                  refetch();
                } else {
                  toast.error(signError ?? "Erreur lors de la signature");
                }
              }}
            >
              {signing ? "Signature en cours…" : "Confirmer la signature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Header ── */}
      <div>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Devis
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {quote.quote_number}
              </h1>
              {quote.version_number > 1 && (
                <span className="text-sm text-muted-foreground font-mono">v{quote.version_number}</span>
              )}
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${kindCfg.className}`}>
                {kindCfg.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
            </div>

            {quote.signed_at && (
              <p className="text-sm text-accent flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Signé le {fmtDate(quote.signed_at)}
              </p>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {quote.quote_status === "draft" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/projects/${quote.project_id}/quotes/new`)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  disabled={transitioning}
                  onClick={() => transitionStatus("sent")}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Envoyer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Supprimer
                </Button>
              </>
            )}

            {quote.quote_status === "sent" && (
              <>
                {quote.quote_kind === "final" && (
                  <Button
                    size="sm"
                    variant="success"
                    disabled={transitioning || signing}
                    onClick={() => setShowSignConfirm(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Marquer comme signé
                  </Button>
                )}
                {quote.quote_kind === "estimate" && (
                  <span className="inline-flex items-center rounded-md bg-info/10 text-info px-3 py-1.5 text-xs font-medium">
                    Devis estimatif — non signable. Créez un devis final pour signer.
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={transitioning || signing}
                  onClick={() => transitionStatus("lost")}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Marquer perdu
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bientôt disponible</TooltipContent>
                </Tooltip>
              </>
            )}

            {quote.quote_status === "signed" && (
              <>
                {depositInvoice ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/invoices/${depositInvoice.id}`)}
                  >
                    <Receipt className="h-3.5 w-3.5 mr-1" />
                    Voir la facture d'acompte
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled>
                        <Receipt className="h-3.5 w-3.5 mr-1" />
                        Facture d'acompte
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Aucune facture trouvée</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>
                      <Receipt className="h-3.5 w-3.5 mr-1" />
                      Facture finale
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bientôt disponible</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Meta cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Date du devis
          </p>
          <p className="text-sm font-medium">{fmtDate(quote.quote_date)}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Validité
          </p>
          <p className="text-sm font-medium">{fmtDate(quote.expiry_date)}</p>
          {quote.quote_status === "sent" && new Date(quote.expiry_date) < new Date() && (
            <p className="text-xs text-destructive">Expiré</p>
          )}
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Envoyé le</p>
          <p className="text-sm font-medium">{quote.sent_at ? fmtDate(quote.sent_at) : "—"}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Signé le</p>
          <p className="text-sm font-medium">{quote.signed_at ? fmtDate(quote.signed_at) : "—"}</p>
        </Card>
      </div>

      {/* ── Project link + Client + Property ── */}
      {project && (
        <Card className="p-4 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Projet</span>
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            {project.project_number}
            <ExternalLink className="h-3 w-3" />
          </button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Client</h2>
          </div>
          <button
            onClick={() => navigate(`/clients/${customer.id}`)}
            className="font-medium text-sm text-primary hover:underline flex items-center gap-1"
          >
            {customer.name}
            <ExternalLink className="h-3 w-3" />
          </button>
          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Mail className="h-3 w-3" />
                {customer.email}
              </a>
            )}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </a>
            )}
          </div>
        </Card>

        {property && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Adresse d'intervention</h2>
            </div>
            <div className="text-sm space-y-0.5">
              {property.address_line1 && <p>{property.address_line1}</p>}
              {property.address_line2 && <p className="text-muted-foreground">{property.address_line2}</p>}
              <p>
                {[property.postal_code, property.city].filter(Boolean).join(" ")}
              </p>
            </div>
          </Card>
        )}
      </div>

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
                        <div>
                          <p className="font-medium text-sm">{line.label}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {line.qty}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {line.unit ? UNIT_LABELS[line.unit] ?? line.unit : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmt(line.unit_price_ht)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {line.vat_rate.toLocaleString("fr-FR")}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {fmt(line.total_line_ht)}
                      </TableCell>
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
                  {/* Timeline line */}
                  {idx < activities.length - 1 && (
                    <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-border bg-background" />
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{activityLabel(activity)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDateFull(activity.occurred_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
