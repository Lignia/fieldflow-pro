import { useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search, FileText, RefreshCw, Plus, AlertTriangle,
  MoreHorizontal, Eye, Send, FilePlus, PenLine, Receipt,
  Trash2, Copy, FolderOpen, Archive, ExternalLink, Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useQuotes,
  QUOTE_STATUS_LABELS,
  QUOTE_KIND_LABELS,
  type QuoteKind,
  type QuoteStatus,
  type QuoteKindFilter,
  type QuoteStatusFilter,
  type Quote,
} from "@/hooks/useQuotes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { NewQuoteModal } from "@/components/quotes/NewQuoteModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { billingDb } from "@/integrations/supabase/schema-clients";

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function isIncompleteDraft(q: Quote): boolean {
  return q.quote_status === "draft" && q.total_ht === 0;
}

const KIND_LABEL: Record<string, string> = {
  estimate: "Estimatif",
  final: "Définitif",
  service: "SAV",
};

function isExpired(q: Quote): boolean {
  if (!q.expiry_date) return false;
  return new Date(q.expiry_date) < new Date() && q.quote_status === "sent";
}

/* ── Single status badge ── */

function StatusBadgeCell({ quote }: { quote: Quote }) {
  const incomplete = isIncompleteDraft(quote);
  const expired = isExpired(quote);

  if (incomplete) {
    return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Incomplet</Badge>;
  }
  if (expired) {
    return <Badge variant="destructive">Expiré</Badge>;
  }
  if (quote.quote_status === "signed") {
    return <Badge className="bg-green-500 text-white hover:bg-green-600">Signé</Badge>;
  }
  if (quote.quote_status === "lost") {
    return <Badge variant="destructive">Perdu</Badge>;
  }
  if (quote.quote_status === "sent") {
    return <Badge variant="default">Envoyé</Badge>;
  }
  // draft with content
  return <Badge variant="secondary">Brouillon</Badge>;
}

/* ── Next action text ── */

function nextActionText(q: Quote): string {
  if (isIncompleteDraft(q)) return "Compléter";
  const { quote_kind: kind, quote_status: status } = q;
  if (kind === "estimate" && status === "draft") return "Envoyer";
  if (kind === "estimate" && status === "sent") return "Créer le définitif";
  if (kind === "final" && status === "draft") return "Envoyer pour signature";
  if (kind === "final" && status === "sent") return "Obtenir la signature";
  if (kind === "service" && status === "draft") return "Envoyer";
  if (kind === "service" && status === "sent") return "Suivre la réponse";
  if (status === "signed") return "Voir la facture";
  if (status === "lost" || status === "expired" || status === "canceled") return "Archiver";
  return "—";
}

/* ── Component ── */

export default function Quotes() {
  const { coreUser } = useCurrentUser();
  const navigate = useNavigate();
  const { quotes, loading, error, refetch } = useQuotes();
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<QuoteKindFilter>("all");
  const [search, setSearch] = useState("");
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);

  if (error && !loading) {
    toast.error(error, { id: "quotes-error" });
  }

  const incompleteCount = useMemo(
    () => quotes.filter(isIncompleteDraft).length,
    [quotes]
  );

  const filtered = useMemo(() => {
    let list = quotes;

    if (showIncompleteOnly) {
      list = list.filter(isIncompleteDraft);
    } else {
      if (statusFilter !== "all") {
        list = list.filter((q) => q.quote_status === statusFilter);
      }
      if (kindFilter !== "all") {
        list = list.filter((q) => q.quote_kind === kindFilter);
      }
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.quote_number.toLowerCase().includes(s) ||
          (q.customer_name ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [quotes, statusFilter, kindFilter, search, showIncompleteOnly]);

  const handleDelete = (quote: Quote) => {
    // TODO: call billingDb delete + refetch
    toast.success(`Devis ${quote.quote_number} supprimé`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      <NewQuoteModal open={showNewQuote} onOpenChange={setShowNewQuote} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Devis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Chargement…" : `${filtered.length} devis`}
          </p>
        </div>
        <div className="flex gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Réessayer
            </Button>
          )}
          <Button size="sm" onClick={() => setShowNewQuote(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nouveau devis
          </Button>
        </div>
      </div>

      {/* Incomplete drafts alert */}
      {!loading && incompleteCount > 0 && (
        <Alert
          variant="destructive"
          className="cursor-pointer"
          onClick={() => setShowIncompleteOnly((v) => !v)}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {incompleteCount} brouillon{incompleteCount > 1 ? "s" : ""} incomplet{incompleteCount > 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            {showIncompleteOnly
              ? "Cliquer pour revenir à la liste complète"
              : "Cliquer pour afficher uniquement ces devis"}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs
          value={showIncompleteOnly ? "__incomplete" : statusFilter}
          onValueChange={(val) => {
            setShowIncompleteOnly(false);
            setStatusFilter(val as QuoteStatusFilter);
          }}
          className="flex-1 min-w-0"
        >
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="draft">À envoyer</TabsTrigger>
            <TabsTrigger value="sent">Envoyés</TabsTrigger>
            <TabsTrigger value="signed">Signés</TabsTrigger>
            <TabsTrigger value="lost">Perdus</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={kindFilter}
          onValueChange={(val) => setKindFilter(val as QuoteKindFilter)}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="estimate">Estimatifs</SelectItem>
            <SelectItem value="final">Définitifs</SelectItem>
            <SelectItem value="service">SAV</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par client ou n° devis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          search={search}
          statusFilter={statusFilter}
          kindFilter={kindFilter}
          showIncompleteOnly={showIncompleteOnly}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Devis</TableHead>
                <TableHead>Client &amp; Chantier</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead className="hidden md:table-cell">Prochaine action</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((quote) => (
                <QuoteTableRow
                  key={quote.id}
                  quote={quote}
                  onDelete={() => setDeleteTarget(quote)}
                  refetch={refetch}
                  coreUserId={coreUser?.id ?? null}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le devis</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer <span className="font-mono font-semibold">{deleteTarget?.quote_number}</span> ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Table Row ── */

function QuoteTableRow({ quote, onDelete }: { quote: Quote; onDelete: () => void }) {
  const navigate = useNavigate();
  const { quote_kind: kind, quote_status: status } = quote;
  const customerDisplay = quote.customer_name;
  const city = quote.city;
  const subLine = [city, quote.quote_kind === "service" ? "SAV" : quote.project_number].filter(Boolean).join(" · ");

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => navigate(`/quotes/${quote.id}`)}
    >
      {/* Col 1: N° Devis */}
      <TableCell>
        <Link
          to={`/quotes/${quote.id}`}
          className="font-mono text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {quote.quote_number}
        </Link>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {KIND_LABEL[kind] ?? kind}
        </p>
      </TableCell>

      {/* Col 2: Client & Chantier */}
      <TableCell>
        {quote.customer_id ? (
          <Link
            to={`/clients/${quote.customer_id}`}
            className="text-sm font-medium hover:underline hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {customerDisplay || "Client inconnu"}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Client inconnu</span>
        )}
        {subLine && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
            {subLine}
          </p>
        )}
      </TableCell>

      {/* Col 3: Statut (single badge) */}
      <TableCell>
        <StatusBadgeCell quote={quote} />
      </TableCell>

      {/* Col 4: Montant TTC */}
      <TableCell className="text-right">
        <span className="font-mono font-semibold text-sm">
          {quote.total_ttc > 0 ? formatCurrency(quote.total_ttc) : "—"}
        </span>
      </TableCell>

      {/* Col 5: Prochaine action (hidden mobile) */}
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground">{nextActionText(quote)}</span>
      </TableCell>

      {/* Col 6: Actions dropdown */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              Ouvrir
            </DropdownMenuItem>

            {status === "draft" && quote.total_ht > 0 && (
              <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
                <Send className="h-3.5 w-3.5 mr-2" />
                Envoyer
              </DropdownMenuItem>
            )}

            {kind === "estimate" && status === "sent" && quote.project_id && (
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/projects/${quote.project_id}/quotes/new?kind=final&from_quote_id=${quote.id}`)
                }
              >
                <FilePlus className="h-3.5 w-3.5 mr-2" />
                Créer devis final
              </DropdownMenuItem>
            )}

            {kind === "final" && status === "sent" && (
              <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
                <PenLine className="h-3.5 w-3.5 mr-2" />
                Signer
              </DropdownMenuItem>
            )}

            {status === "signed" && (
              <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
                <Receipt className="h-3.5 w-3.5 mr-2" />
                Voir la facture
              </DropdownMenuItem>
            )}

            <DropdownMenuItem disabled>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Dupliquer
            </DropdownMenuItem>

            {kind !== "service" && quote.project_id && (
              <DropdownMenuItem onClick={() => navigate(`/projects/${quote.project_id}`)}>
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                Voir le projet
              </DropdownMenuItem>
            )}

            {status === "sent" && (
              <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
                Marquer perdu
              </DropdownMenuItem>
            )}

            {status === "draft" && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/* ── Empty State ── */

function EmptyState({
  search,
  statusFilter,
  kindFilter,
  showIncompleteOnly,
}: {
  search: string;
  statusFilter: QuoteStatusFilter;
  kindFilter: QuoteKindFilter;
  showIncompleteOnly: boolean;
}) {
  return (
    <Card className="p-12 text-center">
      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
      {search.trim() ? (
        <p className="text-sm text-muted-foreground">
          Aucun devis ne correspond à « {search} »
        </p>
      ) : showIncompleteOnly ? (
        <p className="text-sm text-muted-foreground">
          Aucun brouillon incomplet
        </p>
      ) : statusFilter !== "all" ? (
        <p className="text-sm text-muted-foreground">
          Aucun devis avec le statut « {QUOTE_STATUS_LABELS[statusFilter as QuoteStatus] ?? statusFilter} »
        </p>
      ) : kindFilter !== "all" ? (
        <p className="text-sm text-muted-foreground">
          Aucun devis de type « {QUOTE_KIND_LABELS[kindFilter as QuoteKind] ?? kindFilter} »
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-1">
            Aucun devis pour l'instant.
          </p>
          <p className="text-xs text-muted-foreground">
            Créez votre premier devis depuis un projet.
          </p>
        </>
      )}
    </Card>
  );
}