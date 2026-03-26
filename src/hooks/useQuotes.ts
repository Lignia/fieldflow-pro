import { useState, useEffect, useCallback } from "react";
import { billingDb } from "@/integrations/supabase/schema-clients";
import { MOCK_QUOTES as CENTRAL_MOCK_QUOTES } from "@/mocks/data";

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

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_QUOTES: Quote[] = CENTRAL_MOCK_QUOTES.map((q) => ({
  id: q.id,
  quote_number: q.quote_number,
  quote_kind: q.quote_kind as QuoteKind,
  quote_status: q.quote_status as QuoteStatus,
  version_number: q.version_number,
  quote_date: q.quote_date,
  expiry_date: q.expiry_date,
  total_ht: q.total_ht,
  total_vat: q.total_vat,
  total_ttc: q.total_ttc,
  sent_at: q.sent_at,
  signed_at: q.signed_at,
  project_id: q.project_id,
  service_request_id: q.service_request_id,
  installation_id: q.installation_id,
  customer: q.customer as QuoteCustomer,
  property: q.property as QuoteProperty,
}));

export function useQuotes(): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>(DEV_BYPASS ? MOCK_QUOTES : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (DEV_BYPASS) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await billingDb
        .from("quotes")
        .select(`
          id,
          quote_number,
          quote_kind,
          quote_status,
          quote_date,
          expiry_date,
          total_ht,
          total_vat,
          total_ttc,
          sent_at,
          signed_at,
          version_number,
          project_id,
          service_request_id,
          installation_id,
          customer:customer_id (
            id,
            name,
            email,
            phone
          ),
          property:property_id (
            id,
            address_line1,
            city,
            postal_code
          )
        `)
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
        customer: q.customer ?? null,
        property: q.property ?? null,
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
