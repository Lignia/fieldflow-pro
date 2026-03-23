import { useState, useEffect, useCallback } from "react";
import { billingDb } from "@/integrations/supabase/schema-clients";

export type UnitType = "u" | "m" | "m2" | "forfait" | "h";

export const UNIT_LABELS: Record<UnitType, string> = {
  u: "unité",
  m: "m",
  m2: "m²",
  forfait: "forfait",
  h: "heure",
};

export interface QuoteLine {
  id: string;
  label: string;
  qty: number;
  unit: UnitType | null;
  unit_price_ht: number;
  vat_rate: number;
  total_line_ht: number;
  sort_order: number;
}

export interface QuoteDetailCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customer_type: string;
}

export interface QuoteDetailProject {
  id: string;
  project_number: string;
  status: string;
}

export interface QuoteDetailData {
  id: string;
  quote_number: string;
  quote_kind: string;
  quote_status: string;
  version_number: number;
  quote_date: string;
  expiry_date: string;
  sent_at: string | null;
  signed_at: string | null;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  created_at: string;
  modified_at: string;
  customer: QuoteDetailCustomer;
  project: QuoteDetailProject | null;
  lines: QuoteLine[];
}

interface UseQuoteDetailReturn {
  quote: QuoteDetailData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_QUOTE: QuoteDetailData = {
  id: "mock-q4",
  quote_number: "DEV-2025-0009",
  quote_kind: "final",
  quote_status: "signed",
  version_number: 1,
  quote_date: "2025-02-20",
  expiry_date: "2025-03-22",
  sent_at: "2025-02-21T10:00:00Z",
  signed_at: "2025-03-01T14:30:00Z",
  total_ht: 15800,
  total_vat: 3160,
  total_ttc: 18960,
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  modified_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  customer: {
    id: "mock-c1",
    name: "M. Fabre",
    email: "fabre@email.fr",
    phone: "06 11 22 33 44",
    customer_type: "particulier",
  },
  project: {
    id: "mock-p5",
    project_number: "PRJ-0043",
    status: "deposit_paid",
  },
  lines: [
    {
      id: "line-1",
      label: "Poêle à bois Stûv 30-compact",
      qty: 1,
      unit: "u",
      unit_price_ht: 4200,
      vat_rate: 5.5,
      total_line_ht: 4200,
      sort_order: 0,
    },
    {
      id: "line-2",
      label: "Conduit isolé inox Ø150 — 6m",
      qty: 6,
      unit: "m",
      unit_price_ht: 185,
      vat_rate: 5.5,
      total_line_ht: 1110,
      sort_order: 1,
    },
    {
      id: "line-3",
      label: "Plaque de propreté plafond inox",
      qty: 2,
      unit: "u",
      unit_price_ht: 95,
      vat_rate: 5.5,
      total_line_ht: 190,
      sort_order: 2,
    },
    {
      id: "line-4",
      label: "Sortie de toit inox Ø150",
      qty: 1,
      unit: "u",
      unit_price_ht: 420,
      vat_rate: 5.5,
      total_line_ht: 420,
      sort_order: 3,
    },
    {
      id: "line-5",
      label: "Pose et raccordement — forfait",
      qty: 1,
      unit: "forfait",
      unit_price_ht: 2800,
      vat_rate: 10,
      total_line_ht: 2800,
      sort_order: 4,
    },
    {
      id: "line-6",
      label: "Création de l'arrivée d'air",
      qty: 1,
      unit: "forfait",
      unit_price_ht: 650,
      vat_rate: 10,
      total_line_ht: 650,
      sort_order: 5,
    },
    {
      id: "line-7",
      label: "Protection murale — panneau vermiculite",
      qty: 3,
      unit: "m2",
      unit_price_ht: 180,
      vat_rate: 10,
      total_line_ht: 540,
      sort_order: 6,
    },
    {
      id: "line-8",
      label: "Mise en service et réglages",
      qty: 2,
      unit: "h",
      unit_price_ht: 75,
      vat_rate: 10,
      total_line_ht: 150,
      sort_order: 7,
    },
  ],
};

export function useQuoteDetail(quoteId: string | undefined): UseQuoteDetailReturn {
  const [quote, setQuote] = useState<QuoteDetailData | null>(DEV_BYPASS ? MOCK_QUOTE : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (DEV_BYPASS || !quoteId) return;
    setLoading(true);
    setError(null);

    try {
      const [quoteRes, linesRes] = await Promise.all([
        billingDb
          .from("quotes")
          .select(
            "id, quote_number, quote_kind, quote_status, version_number, quote_date, expiry_date, sent_at, signed_at, total_ht, total_vat, total_ttc, created_at, modified_at, customer:customer_id(id, name, email, phone, customer_type), project:project_id(id, project_number, status)"
          )
          .eq("id", quoteId)
          .single(),

        billingDb
          .from("quote_lines")
          .select("id, label, qty, unit, unit_price_ht, vat_rate, total_line_ht, sort_order")
          .eq("quote_id", quoteId)
          .order("sort_order", { ascending: true }),
      ]);

      if (quoteRes.error) {
        setError(quoteRes.error.message);
        return;
      }

      const q = quoteRes.data as any;

      setQuote({
        id: q.id,
        quote_number: q.quote_number,
        quote_kind: q.quote_kind,
        quote_status: q.quote_status,
        version_number: q.version_number,
        quote_date: q.quote_date,
        expiry_date: q.expiry_date,
        sent_at: q.sent_at,
        signed_at: q.signed_at,
        total_ht: Number(q.total_ht) || 0,
        total_vat: Number(q.total_vat) || 0,
        total_ttc: Number(q.total_ttc) || 0,
        created_at: q.created_at,
        modified_at: q.modified_at,
        customer: q.customer ?? { id: "", name: "Client inconnu", email: null, phone: null, customer_type: "particulier" },
        project: q.project ?? null,
        lines: (linesRes.data ?? []).map((l: any) => ({
          id: l.id,
          label: l.label,
          qty: Number(l.qty) || 0,
          unit: l.unit,
          unit_price_ht: Number(l.unit_price_ht) || 0,
          vat_rate: Number(l.vat_rate) || 0,
          total_line_ht: Number(l.total_line_ht) || 0,
          sort_order: l.sort_order,
        })),
      });
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (!DEV_BYPASS) fetchQuote();
  }, [fetchQuote]);

  return { quote, loading, error, refetch: fetchQuote };
}
