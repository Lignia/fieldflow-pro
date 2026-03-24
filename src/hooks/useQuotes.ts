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

const MOCK_QUOTES: Quote[] = [
  {
    id: "mock-q1",
    quote_number: "DEV-2026-0047",
    quote_kind: "estimate",
    quote_status: "draft",
    version_number: 1,
    quote_date: "2026-03-18",
    expiry_date: "2026-04-17",
    total_ht: 3800,
    total_vat: 676,
    total_ttc: 4476,
    sent_at: null,
    signed_at: null,
    project_id: "proj-1",
    service_request_id: null,
    installation_id: null,
    customer: { id: "c1", name: "M. Morel", email: "morel@email.fr", phone: "06 12 34 56 78" },
    property: { id: "p1", address_line1: "12 rue des Lilas", city: "Lyon", postal_code: "69003" },
  },
  {
    id: "mock-q2",
    quote_number: "DEV-2026-0045",
    quote_kind: "final",
    quote_status: "sent",
    version_number: 1,
    quote_date: "2026-03-10",
    expiry_date: "2026-04-09",
    total_ht: 5200,
    total_vat: 936,
    total_ttc: 6136,
    sent_at: "2026-03-11T10:00:00Z",
    signed_at: null,
    project_id: "proj-2",
    service_request_id: null,
    installation_id: null,
    customer: { id: "c2", name: "Mme Durand", email: "durand@email.fr", phone: "06 98 76 54 32" },
    property: { id: "p2", address_line1: "8 avenue Foch", city: "Paris", postal_code: "75016" },
  },
  {
    id: "mock-q3",
    quote_number: "DEV-2026-0041",
    quote_kind: "service",
    quote_status: "signed",
    version_number: 2,
    quote_date: "2026-02-20",
    expiry_date: "2026-03-22",
    total_ht: 1800,
    total_vat: 360,
    total_ttc: 2160,
    sent_at: "2026-02-21T09:00:00Z",
    signed_at: "2026-02-25T14:30:00Z",
    project_id: "proj-3",
    service_request_id: null,
    installation_id: null,
    customer: { id: "c3", name: "M. Fabre", email: "fabre@email.fr", phone: "06 55 44 33 22" },
    property: { id: "p3", address_line1: "24 chemin du Moulin", city: "Grenoble", postal_code: "38000" },
  },
];

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
