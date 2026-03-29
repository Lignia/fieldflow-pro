import { useState, useEffect, useCallback } from "react";
import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";

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

export interface QuoteCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface QuoteProperty {
  id: string;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
}

export interface Quote {
  id: string;
  quote_number: string;
  quote_kind: QuoteKind;
  quote_status: QuoteStatus;
  version_number: number;
  quote_date: string;
  expiry_date: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  sent_at: string | null;
  signed_at: string | null;
  project_id: string | null;
  service_request_id: string | null;
  installation_id: string | null;
  customer: QuoteCustomer | null;
  property: QuoteProperty | null;
}

interface UseQuotesReturn {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

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
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const mapped: Quote[] = (data ?? []).map((q: any) => ({
        id: q.id,
        quote_number: q.quote_number,
        quote_kind: q.quote_kind,
        quote_status: q.quote_status,
        version_number: q.version_number ?? 1,
        quote_date: q.quote_date,
        expiry_date: q.expiry_date,
        total_ht: Number(q.total_ht) || 0,
        total_vat: Number(q.total_vat) || 0,
        total_ttc: Number(q.total_ttc) || 0,
        sent_at: q.sent_at ?? null,
        signed_at: q.signed_at ?? null,
        project_id: q.project_id ?? null,
        service_request_id: q.service_request_id ?? null,
        installation_id: q.installation_id ?? null,
        customer: q.customer_name ? { id: q.customer_id ?? "", name: q.customer_name, email: q.customer_email ?? null, phone: q.customer_phone ?? null } : null,
        property: q.property_id ? { id: q.property_id, address_line1: q.address_line1 ?? null, city: q.city ?? null, postal_code: q.postal_code ?? null } : null,
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
