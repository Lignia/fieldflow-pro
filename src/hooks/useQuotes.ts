import { useState, useEffect, useCallback } from "react";
import { billingDb } from "@/integrations/supabase/schema-clients";

export type QuoteStatus = "draft" | "sent" | "signed" | "lost" | "expired" | "canceled";
export type QuoteKind = "estimate" | "final" | "service";

export const ALL_QUOTE_STATUSES: QuoteStatus[] = [
  "draft", "sent", "signed", "lost", "expired", "canceled",
];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  signed: "Signé",
  lost: "Perdu",
  expired: "Expiré",
  canceled: "Annulé",
};

export const QUOTE_KIND_LABELS: Record<QuoteKind, string> = {
  estimate: "Estimatif",
  final: "Définitif",
  service: "SAV",
};

export type QuoteStatusFilter = QuoteStatus | "all";

export interface Quote {
  id: string;
  quote_number: string;
  quote_kind: QuoteKind;
  quote_status: QuoteStatus;
  version_number: number;
  quote_date: string;
  expiry_date: string;
  total_ht: number;
  total_ttc: number;
  customer_name: string;
  project_number: string | null;
  created_at: string;
  modified_at: string;
}

interface UseQuotesReturn {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  statusFilter: QuoteStatusFilter;
  setStatusFilter: (s: QuoteStatusFilter) => void;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_QUOTES: Quote[] = [
  {
    id: "mock-q1",
    quote_number: "DEV-2025-0012",
    quote_kind: "estimate",
    quote_status: "draft",
    version_number: 1,
    quote_date: "2025-03-18",
    expiry_date: "2025-04-17",
    total_ht: 8500,
    total_ttc: 10200,
    customer_name: "M. Morel",
    project_number: "PRJ-0047",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "mock-q2",
    quote_number: "DEV-2025-0011",
    quote_kind: "final",
    quote_status: "sent",
    version_number: 1,
    quote_date: "2025-03-10",
    expiry_date: "2025-04-09",
    total_ht: 12400,
    total_ttc: 14880,
    customer_name: "Mme Durand",
    project_number: "PRJ-0045",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "mock-q3",
    quote_number: "DEV-2025-0010",
    quote_kind: "estimate",
    quote_status: "sent",
    version_number: 2,
    quote_date: "2025-03-05",
    expiry_date: "2025-03-20",
    total_ht: 6200,
    total_ttc: 7440,
    customer_name: "M. Bernard",
    project_number: "PRJ-0044",
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "mock-q4",
    quote_number: "DEV-2025-0009",
    quote_kind: "final",
    quote_status: "signed",
    version_number: 1,
    quote_date: "2025-02-20",
    expiry_date: "2025-03-22",
    total_ht: 15800,
    total_ttc: 18960,
    customer_name: "M. Fabre",
    project_number: "PRJ-0043",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "mock-q5",
    quote_number: "DEV-2025-0008",
    quote_kind: "service",
    quote_status: "expired",
    version_number: 1,
    quote_date: "2025-01-15",
    expiry_date: "2025-02-14",
    total_ht: 950,
    total_ttc: 1140,
    customer_name: "Mme Petit",
    project_number: null,
    created_at: new Date(Date.now() - 65 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: "mock-q6",
    quote_number: "DEV-2024-0042",
    quote_kind: "estimate",
    quote_status: "lost",
    version_number: 1,
    quote_date: "2024-12-10",
    expiry_date: "2025-01-09",
    total_ht: 9300,
    total_ttc: 11160,
    customer_name: "M. Garcia",
    project_number: "PRJ-0040",
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 75 * 86400000).toISOString(),
  },
];

function filterMock(search: string, statusFilter: QuoteStatusFilter): Quote[] {
  let list = MOCK_QUOTES;
  if (statusFilter !== "all") {
    list = list.filter((q) => q.quote_status === statusFilter);
  }
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter(
      (q) =>
        q.customer_name.toLowerCase().includes(s) ||
        q.quote_number.toLowerCase().includes(s)
    );
  }
  return list;
}

export function useQuotes(): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>(DEV_BYPASS ? MOCK_QUOTES : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");

  const fetchQuotes = useCallback(async () => {
    if (DEV_BYPASS) return;
    setLoading(true);
    setError(null);

    try {
      let query = billingDb
        .from("quotes")
        .select(
          "id, quote_number, quote_kind, quote_status, version_number, quote_date, expiry_date, total_ht, total_ttc, created_at, modified_at, customer:customer_id(name), project:project_id(project_number)"
        )
        .order("modified_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("quote_status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const mapped: Quote[] = (data ?? []).map((q: any) => ({
        id: q.id,
        quote_number: q.quote_number,
        quote_kind: q.quote_kind,
        quote_status: q.quote_status,
        version_number: q.version_number,
        quote_date: q.quote_date,
        expiry_date: q.expiry_date,
        total_ht: Number(q.total_ht) || 0,
        total_ttc: Number(q.total_ttc) || 0,
        customer_name: q.customer?.name ?? "Client inconnu",
        project_number: q.project?.project_number ?? null,
        created_at: q.created_at,
        modified_at: q.modified_at,
      }));

      if (search.trim()) {
        const s = search.trim().toLowerCase();
        setQuotes(
          mapped.filter(
            (q) =>
              q.customer_name.toLowerCase().includes(s) ||
              q.quote_number.toLowerCase().includes(s)
          )
        );
      } else {
        setQuotes(mapped);
      }
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (DEV_BYPASS) {
      setQuotes(filterMock(search, statusFilter));
      return;
    }
    const debounce = setTimeout(fetchQuotes, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, fetchQuotes]);

  return { quotes, loading, error, search, setSearch, statusFilter, setStatusFilter, refetch: fetchQuotes };
}
