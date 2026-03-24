import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, FileText, RefreshCw, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  useQuotes,
  ALL_QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_KIND_LABELS,
  type QuoteStatus,
  type QuoteStatusFilter,
  type Quote,
} from "@/hooks/useQuotes";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewQuoteModal } from "@/components/quotes/NewQuoteModal";

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatShortDate(date: string): string {
  return format(new Date(date), "d MMM yyyy", { locale: fr });
}

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/15 text-info",
  signed: "bg-accent/15 text-accent",
  lost: "bg-destructive/15 text-destructive",
  expired: "bg-warning/15 text-warning",
  canceled: "bg-muted text-muted-foreground",
};

const KIND_COLORS: Record<string, string> = {
  estimate: "bg-info/15 text-info",
  final: "bg-accent/15 text-accent",
  service: "bg-warning/15 text-warning",
};

const FILTER_TABS: { key: QuoteStatusFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  ...ALL_QUOTE_STATUSES.map((s) => ({ key: s as QuoteStatusFilter, label: QUOTE_STATUS_LABELS[s] })),
];

/* ── Component ── */

export default function Quotes() {
  const navigate = useNavigate();
  const { quotes, loading, error, refetch } = useQuotes();
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showNewQuote, setShowNewQuote] = useState(false);

  // Show error toast once
  if (error && !loading) {
    toast.error(error, { id: "quotes-error" });
  }

  const filtered = useMemo(() => {
    let list = quotes;
    if (statusFilter !== "all") {
      list = list.filter((q) => q.quote_status === statusFilter);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (q) =>
          q.quote_number.toLowerCase().includes(s) ||
          (q.customer?.name ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [quotes, statusFilter, search]);

  return (
    <div className="space-y-6">
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

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? "default" : "ghost"}
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
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
        <EmptyState search={search} statusFilter={statusFilter} />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} onClick={() => navigate(`/quotes/${quote.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function QuoteRow({ quote, onClick }: { quote: Quote; onClick: () => void }) {
  const address = [quote.property?.address_line1, quote.property?.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {/* Quote number */}
        <span className="font-mono text-xs text-muted-foreground shrink-0">
          {quote.quote_number}
          {quote.version_number > 1 && (
            <span className="ml-1 opacity-60">v{quote.version_number}</span>
          )}
        </span>

        {/* Customer */}
        <span className="text-sm font-medium min-w-0 truncate">
          {quote.customer?.name ?? "Client inconnu"}
        </span>

        {/* Address */}
        {address && (
          <span className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[200px]">
            {address}
          </span>
        )}

        <span className="flex-1" />

        {/* Kind badge */}
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${KIND_COLORS[quote.quote_kind] ?? ""}`}>
          {QUOTE_KIND_LABELS[quote.quote_kind] ?? quote.quote_kind}
        </span>

        {/* Status badge */}
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[quote.quote_status] ?? ""}`}>
          {QUOTE_STATUS_LABELS[quote.quote_status] ?? quote.quote_status}
        </span>

        {/* Amount */}
        <span className="font-mono text-sm font-semibold shrink-0">
          {formatCurrency(quote.total_ttc)}
        </span>

        {/* Date */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatShortDate(quote.quote_date)}
        </span>

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </div>
    </Card>
  );
}

function EmptyState({ search, statusFilter }: { search: string; statusFilter: QuoteStatusFilter }) {
  return (
    <Card className="p-12 text-center">
      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
      {search.trim() ? (
        <p className="text-sm text-muted-foreground">
          Aucun devis ne correspond à « {search} »
        </p>
      ) : statusFilter !== "all" ? (
        <p className="text-sm text-muted-foreground">
          Aucun devis avec le statut « {QUOTE_STATUS_LABELS[statusFilter]} »
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
