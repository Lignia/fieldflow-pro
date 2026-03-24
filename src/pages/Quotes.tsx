import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  useQuotes,
  ALL_QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_KIND_LABELS,
  type QuoteStatusFilter,
} from "@/hooks/useQuotes";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

const FILTER_TABS: { key: QuoteStatusFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  ...ALL_QUOTE_STATUSES.map((s) => ({ key: s as QuoteStatusFilter, label: QUOTE_STATUS_LABELS[s] })),
];

export default function Quotes() {
  const navigate = useNavigate();
  const {
    quotes,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refetch,
  } = useQuotes();

  if (error && !loading) {
    toast.error(error, { id: "quotes-error" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Devis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Chargement…"
              : `${quotes.length} devis`}
          </p>
        </div>
        <div className="flex gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Réessayer
            </Button>
          )}
          <Button size="sm" onClick={() => navigate("/quotes/new")}>
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
      ) : quotes.length === 0 ? (
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
                Aucun devis pour le moment
              </p>
              <p className="text-xs text-muted-foreground">
                Les devis seront créés depuis la fiche projet.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {quotes.map((quote) => {
            const isOverdue =
              quote.quote_status === "sent" &&
              new Date(quote.expiry_date) < new Date();

            return (
              <Card
                key={quote.id}
                className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
                onClick={() => navigate(`/quotes/${quote.id}`)}
              >
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  {/* Quote number */}
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {quote.quote_number}
                    {quote.version_number > 1 && (
                      <span className="ml-1 text-muted-foreground/60">
                        v{quote.version_number}
                      </span>
                    )}
                  </span>

                  {/* Customer */}
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">
                    {quote.customer_name}
                  </span>

                  {/* Kind badge */}
                  <StatusBadge status={quote.quote_kind} type="quote_kind" size="sm" />

                  {/* Status badge */}
                  <StatusBadge status={quote.quote_status} type="quote" size="sm" />

                  {/* Overdue indicator */}
                  {isOverdue && (
                    <span className="text-xs font-medium text-destructive shrink-0">
                      Expiré
                    </span>
                  )}

                  {/* Amount */}
                  <span className="font-mono text-sm font-semibold shrink-0">
                    {formatCurrency(quote.total_ttc)}
                  </span>

                  {/* Project ref */}
                  {quote.project_number && (
                    <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
                      {quote.project_number}
                    </span>
                  )}

                  {/* Date */}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(quote.modified_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
