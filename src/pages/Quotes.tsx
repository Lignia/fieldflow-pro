import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search, FileText, RefreshCw, Plus, ChevronRight,
  Send, FilePlus, PenLine, Receipt,
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
import { Skeleton } from "@/components/ui/skeleton";
import { NewQuoteModal } from "@/components/quotes/NewQuoteModal";

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatShortDate(date: string): string {
  return format(new Date(date), "d MMM yyyy", { locale: fr });
}

/* ── Filter config ── */

const KIND_TABS: { key: QuoteKindFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "estimate", label: "Estimatifs" },
  { key: "final", label: "Définitifs" },
  { key: "service", label: "SAV" },
];

const STATUS_TABS: { key: QuoteStatusFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "draft", label: "À envoyer" },
  { key: "sent", label: "Envoyés" },
  { key: "signed", label: "Signés" },
  { key: "lost", label: "Perdus" },
  { key: "incomplete", label: "Brouillons incomplets" },
];

/* ── Badge colors ── */

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/15 text-info",
  signed: "bg-accent/15 text-accent",
  lost: "bg-destructive/15 text-destructive",
  expired: "bg-warning/15 text-warning",
  canceled: "bg-muted text-muted-foreground",
};

const KIND_COLORS: Record<QuoteKind, string> = {
  estimate: "bg-info/10 text-info",
  final: "bg-accent/10 text-accent",
  service: "bg-warning/10 text-warning",
};

/* ── Incomplete draft detection ── */

function isIncompleteDraft(q: Quote): boolean {
  return q.quote_status === "draft" && q.total_ht === 0;
}

/* ── Component ── */

export default function Quotes() {
  const navigate = useNavigate();
  const { quotes, loading, error, refetch } = useQuotes();
  const [kindFilter, setKindFilter] = useState<QuoteKindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showNewQuote, setShowNewQuote] = useState(false);

  if (error && !loading) {
    toast.error(error, { id: "quotes-error" });
  }

  const filtered = useMemo(() => {
    let list = quotes;

    // Hide incomplete drafts unless explicitly filtered
    if (statusFilter === "incomplete") {
      list = list.filter(isIncompleteDraft);
    } else {
      list = list.filter((q) => !isIncompleteDraft(q));

      if (kindFilter !== "all") {
        list = list.filter((q) => q.quote_kind === kindFilter);
      }
      if (statusFilter !== "all") {
        list = list.filter((q) => q.quote_status === statusFilter);
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
  }, [quotes, kindFilter, statusFilter, search]);

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

      {/* Kind filter */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {KIND_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={kindFilter === tab.key ? "default" : "ghost"}
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => setKindFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? "secondary" : "ghost"}
            size="xs"
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
        <EmptyState search={search} statusFilter={statusFilter} kindFilter={kindFilter} />
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

  return (
    <Card className="p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {/* Quote number → link to detail */}
        <Link
          to={`/quotes/${quote.id}`}
          className="font-mono text-xs text-primary hover:underline shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {quote.quote_number}
        </Link>

        {/* Combined badge: kind · status */}
        <CombinedBadge kind={quote.quote_kind} status={quote.quote_status} />

        {/* Customer → link */}
        {quote.customer_name && quote.customer_id ? (
          <Link
            to={`/clients/${quote.customer_id}`}
            className="text-sm font-medium min-w-0 truncate hover:text-primary hover:underline"
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
        <Link to={`/quotes/${quote.id}`} className="shrink-0" tabIndex={-1}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </Link>
      </div>
    </Card>
  );
}

/* ── Combined Badge ── */

function CombinedBadge({ kind, status }: { kind: QuoteKind; status: QuoteStatus }) {
  const kindLabel = QUOTE_KIND_LABELS[kind] ?? kind;
  const statusLabel = QUOTE_STATUS_LABELS[status] ?? status;
  // Use status color as the dominant one
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${colorClass}`}>
      {kindLabel} · {statusLabel}
    </span>
  );
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
        className="hidden md:inline text-xs font-mono text-muted-foreground hover:text-primary hover:underline shrink-0"
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

  // estimate + draft → Envoyer
  if (kind === "estimate" && status === "draft") {
    return (
      <Button
        variant="ghost" size="xs"
        className="text-xs shrink-0"
        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
      >
        <Send className="h-3 w-3 mr-1" />
        Envoyer
      </Button>
    );
  }

  // estimate + sent → Créer devis final
  if (kind === "estimate" && status === "sent" && quote.project_id) {
    return (
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
    );
  }

  // final + draft → Envoyer
  if (kind === "final" && status === "draft") {
    return (
      <Button
        variant="ghost" size="xs"
        className="text-xs shrink-0"
        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
      >
        <Send className="h-3 w-3 mr-1" />
        Envoyer
      </Button>
    );
  }

  // final + sent → Signer
  if (kind === "final" && status === "sent") {
    return (
      <Button
        variant="ghost" size="xs"
        className="text-xs text-accent shrink-0"
        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
      >
        <PenLine className="h-3 w-3 mr-1" />
        Signer
      </Button>
    );
  }

  // signed → Voir facture
  if (status === "signed") {
    return (
      <Button
        variant="ghost" size="xs"
        className="text-xs shrink-0"
        onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}
      >
        <Receipt className="h-3 w-3 mr-1" />
        Facture
      </Button>
    );
  }

  return null;
}

/* ── Empty State ── */

function EmptyState({
  search,
  statusFilter,
  kindFilter,
}: {
  search: string;
  statusFilter: QuoteStatusFilter;
  kindFilter: QuoteKindFilter;
}) {
  return (
    <Card className="p-12 text-center">
      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
      {search.trim() ? (
        <p className="text-sm text-muted-foreground">
          Aucun devis ne correspond à « {search} »
        </p>
      ) : statusFilter === "incomplete" ? (
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
