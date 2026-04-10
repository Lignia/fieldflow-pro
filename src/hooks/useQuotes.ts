import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

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

export type QuoteStatusFilter = QuoteStatus | "all" | "incomplete";
export type QuoteKindFilter = QuoteKind | "all";

export interface Quote {
  id: string;
  quote_number: string;
  quote_kind: QuoteKind;
  quote_status: QuoteStatus;
  quote_date: string;
  expiry_date: string;
  total_ht: number;
  total_ttc: number;
  customer_id: string | null;
  customer_name: string | null;
  address_line1: string | null;
  city: string | null;
  project_id: string | null;
  project_number: string | null;
  service_request_id: string | null;
}

interface UseQuotesReturn {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const SELECTED_COLUMNS = [
  "id", "quote_number", "quote_kind", "quote_status",
  "quote_date", "expiry_date", "total_ht", "total_ttc",
  "customer_id", "customer_name",
  "address_line1", "city",
  "project_id", "service_request_id",
].join(", ");

export function useQuotes(): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await coreDb
        .from("v_quotes_with_customer")
        .select(SELECTED_COLUMNS)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const rows = data ?? [];

      // Collect unique project_ids to fetch project_numbers
      const projectIds = [...new Set(
        rows.map((q: any) => q.project_id).filter(Boolean)
      )] as string[];

      let projectMap: Record<string, string> = {};
      if (projectIds.length > 0) {
        const { data: projData } = await coreDb
          .from("v_projects_with_customer")
          .select("id, project_number")
          .in("id", projectIds);
        if (projData) {
          for (const p of projData) {
            projectMap[p.id] = p.project_number;
          }
        }
      }

      const mapped: Quote[] = rows.map((q: any) => ({
        id: q.id,
        quote_number: q.quote_number,
        quote_kind: q.quote_kind,
        quote_status: q.quote_status,
        quote_date: q.quote_date,
        expiry_date: q.expiry_date,
        total_ht: Number(q.total_ht) || 0,
        total_ttc: Number(q.total_ttc) || 0,
        customer_id: q.customer_id ?? null,
        customer_name: q.customer_name ?? null,
        address_line1: q.address_line1 ?? null,
        city: q.city ?? null,
        project_id: q.project_id ?? null,
        project_number: q.project_id ? (projectMap[q.project_id] ?? null) : null,
        service_request_id: q.service_request_id ?? null,
      }));

      setQuotes(mapped);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return { quotes, loading, error, refetch: fetchQuotes };
}
