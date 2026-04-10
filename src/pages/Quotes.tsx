import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search, FileText, RefreshCw, Plus, ChevronRight,
  Send, FilePlus, PenLine, Receipt, AlertTriangle,
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NewQuoteModal } from "@/components/quotes/NewQuoteModal";

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatShortDate(date: string): string {
  return format(new Date(date), "d MMM yyyy", { locale: fr });
}

function isIncompleteDraft(q: Quote): boolean {
  return q.quote_status === "draft" && q.total_ht === 0;
}

/* ── Badge variant mapping ── */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const STATUS_BADGE_VARIANT: Record<QuoteStatus, BadgeVariant> = {
  draft: "secondary",
  sent: "default",
  signed: "success",
  lost: "outline",
  expired: "destructive",
  canceled: "outline",
};

/* ── Component ── */

export default function Quotes() {
  const navigate = useNavigate();
  const { quotes, loading, error, refetch } = useQuotes();
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<QuoteKindFilter>("all");
  const [search, setSearch] = useState("");
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

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

      {/* Filters row: Tabs (status) + Select (type) */}
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

      {/* List */}
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
        <div className="space-y-1.5">
          {filtered.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── QuoteRow ── */

function QuoteRow({ quote }: { quote: Quote }) {
  const navigate = useNavigate();
  const address = [quote.address_line1, quote.city].filter(Boolean).join(", ");
  const incomplete = isIncompleteDraft(quote);

  return (
    <Card
      className="p-4 hover:border-primary/20 transition-colors cursor-pointer group"
      onClick={() => navigate(`/quotes/${quote.id}`)}
    >
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {/* Quote number */}
        <span className="font-mono text-xs text-primary shrink-0">
          {quote.quote_number}
        </span>

        {/* Status badge (primary) */}
        <StatusBadge status={quote.quote_status} />

        {/* Incomplete badge */}
        {incomplete && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Incomplet
          </Badge>
        )}

        {/* Type badge (secondary, discreet) */}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
          {QUOTE_KIND_LABELS[quote.quote_kind] ?? quote.quote_kind}
        </Badge>

        {/* Customer */}
        {quote.customer_name && quote.customer_id ? (
          <Link
            to={`/clients/${quote.customer_id}`}
            className="text-sm font-medium min-w-0 truncate opacity-80 group-hover:opacity-100 hover:text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {quote.customer_name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground truncate">Client inconnu</span>
        )}

        {/* Address */}
        {address && (
          <span className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[180px]">
            {address}
          </span>
        )}

        {/* Context link: project or SAV */}
        <ContextLink quote={quote} />

        <span className="flex-1" />

        {/* Amount */}
        <span className="font-mono text-sm font-semibold shrink-0">
          {formatCurrency(quote.total_ttc)}
        </span>

        {/* Date */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatShortDate(quote.quote_date)}
        </span>

        {/* Quick action */}
        <QuickAction quote={quote} />

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </div>
    </Card>
  );
}

/* ── Status Badge ── */

function StatusBadge({ status }: { status: QuoteStatus }) {
  const label = QUOTE_STATUS_LABELS[status] ?? status;
  const variant = STATUS_BADGE_VARIANT[status] ?? "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

/* ── Context Link (project or SAV) ── */

function ContextLink({ quote }: { quote: Quote }) {
  if (quote.quote_kind === "service") {
    if (quote.service_request_id) {
      return (
        <span className="hidden md:inline text-xs text-warning font-medium shrink-0">
          Demande SAV
        </span>
      );
    }
    return null;
  }

  if (quote.project_id) {
    return (
      <Link
        to={`/projects/${quote.project_id}`}
        className="hidden md:inline text-xs font-mono text-muted-foreground opacity-80 group-hover:opacity-100 hover:text-primary hover:underline shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {quote.project_number ?? "Projet"}
      </Link>
    );
  }
  return null;
}

/* ── Quick Action ── */

function QuickAction({ quote }: { quote: Quote }) {
  const navigate = useNavigate();
  const { quote_kind: kind, quote_status: status } = quote;

  if (kind === "estimate" && status === "draft") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="xs"
            className="text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
          >
            <Send className="h-3 w-3 mr-1" />
            Envoyer
          </Button>
        </TooltipTrigger>
        <TooltipContent>Envoyer le devis estimatif au client</TooltipContent>
      </Tooltip>
    );
  }

  if (kind === "estimate" && status === "sent" && quote.project_id) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="xs"
            className="text-xs shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${quote.project_id}/quotes/new?kind=final`);
            }}
          >
            <FilePlus className="h-3 w-3 mr-1" />
            Devis final
          </Button>
        </TooltipTrigger>
        <TooltipContent>Créer le devis définitif à partir de cet estimatif</TooltipContent>
      </Tooltip>
    );
  }

  if ((kind === "final" || kind === "service") && status === "draft") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="xs"
            className="text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
          >
            <Send className="h-3 w-3 mr-1" />
            Envoyer
          </Button>
        </TooltipTrigger>
        <TooltipContent>Envoyer le devis au client</TooltipContent>
      </Tooltip>
    );
  }

  if (kind === "final" && status === "sent") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="xs"
            className="text-xs text-accent shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
          >
            <PenLine className="h-3 w-3 mr-1" />
            Signer
          </Button>
        </TooltipTrigger>
        <TooltipContent>Marquer le devis comme signé par le client</TooltipContent>
      </Tooltip>
    );
  }

  if (status === "signed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="xs"
            className="text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
          >
            <Receipt className="h-3 w-3 mr-1" />
            Facture
          </Button>
        </TooltipTrigger>
        <TooltipContent>Voir la facture d'acompte liée</TooltipContent>
      </Tooltip>
    );
  }

  return null;
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
