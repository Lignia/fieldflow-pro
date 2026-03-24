import { useState, useEffect, useCallback } from "react";
import { billingDb } from "@/integrations/supabase/schema-clients";
import { coreDb } from "@/integrations/supabase/schema-clients";

export type UnitType = "u" | "m" | "m2" | "forfait" | "h";

export const UNIT_LABELS: Record<UnitType, string> = {
  u: "unité",
  m: "m",
  m2: "m²",
  forfait: "forfait",
  h: "heure",
};

export interface QuoteLineProduct {
  id: string;
  name: string;
  sku: string | null;
}

export interface QuoteLine {
  id: string;
  label: string;
  qty: number;
  unit: UnitType | null;
  unit_price_ht: number;
  vat_rate: number;
  total_line_ht: number;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  product: QuoteLineProduct | null;
}

export interface QuoteDetailCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface QuoteDetailProperty {
  id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
}

export interface QuoteDetailProject {
  id: string;
  project_number: string;
  status: string;
}

export interface QuoteActivity {
  id: string;
  activity_type: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
  actor: { full_name: string | null } | null;
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
  project_id: string | null;
  previous_quote_id: string | null;
  customer: QuoteDetailCustomer;
  property: QuoteDetailProperty | null;
}

interface UseQuoteDetailReturn {
  quote: QuoteDetailData | null;
  lines: QuoteLine[];
  activities: QuoteActivity[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_LINES: QuoteLine[] = [
  {
    id: "line-1",
    label: "Poêle Invicta Onsen 8kW",
    qty: 1,
    unit: "u",
    unit_price_ht: 2890,
    vat_rate: 5.5,
    total_line_ht: 2890,
    sort_order: 0,
    metadata: null,
    product: { id: "p1", name: "Poêle Invicta Onsen 8kW", sku: "INV-ONS-8K" },
  },
  {
    id: "line-2",
    label: "Kit raccordement inox Ø150",
    qty: 1,
    unit: "u",
    unit_price_ht: 485,
    vat_rate: 10,
    total_line_ht: 485,
    sort_order: 1,
    metadata: null,
    product: { id: "p2", name: "Kit raccordement inox Ø150", sku: "KIT-RAC-150" },
  },
  {
    id: "line-3",
    label: "Plaque de sol verre trempé",
    qty: 1,
    unit: "u",
    unit_price_ht: 189,
    vat_rate: 10,
    total_line_ht: 189,
    sort_order: 2,
    metadata: null,
    product: { id: "p3", name: "Plaque de sol verre trempé", sku: "PLQ-SOL-VT" },
  },
  {
    id: "line-4",
    label: "Main d'œuvre pose + mise en service",
    qty: 8,
    unit: "h",
    unit_price_ht: 78,
    vat_rate: 10,
    total_line_ht: 624,
    sort_order: 3,
    metadata: null,
    product: null,
  },
];

const MOCK_ACTIVITIES: QuoteActivity[] = [
  {
    id: "act-1",
    activity_type: "wf_quote_sent",
    payload: null,
    occurred_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    actor: { full_name: "Jean Dupont" },
  },
  {
    id: "act-2",
    activity_type: "wf_status_change",
    payload: { from_status: "draft", to_status: "sent" },
    occurred_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    actor: { full_name: "Jean Dupont" },
  },
  {
    id: "act-3",
    activity_type: "wf_status_change",
    payload: { from_status: null, to_status: "draft" },
    occurred_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    actor: { full_name: "Système" },
  },
];

const MOCK_QUOTE: QuoteDetailData = {
  id: "mock-q1",
  quote_number: "DEV-2026-0047",
  quote_kind: "final",
  quote_status: "sent",
  version_number: 1,
  quote_date: "2026-03-15",
  expiry_date: "2026-04-14",
  sent_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  signed_at: null,
  total_ht: 4188,
  total_vat: 289,
  total_ttc: 4477,
  project_id: "mock-p1",
  previous_quote_id: null,
  customer: {
    id: "mock-c1",
    name: "M. & Mme Morel",
    email: "morel@email.fr",
    phone: "06 12 34 56 78",
  },
  property: {
    id: "mock-prop1",
    address_line1: "12 chemin des Érables",
    address_line2: null,
    city: "Annecy",
    postal_code: "74000",
  },
};

export function useQuoteDetail(quoteId: string | undefined): UseQuoteDetailReturn {
  const [quote, setQuote] = useState<QuoteDetailData | null>(DEV_BYPASS ? MOCK_QUOTE : null);
  const [lines, setLines] = useState<QuoteLine[]>(DEV_BYPASS ? MOCK_LINES : []);
  const [activities, setActivities] = useState<QuoteActivity[]>(DEV_BYPASS ? MOCK_ACTIVITIES : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (DEV_BYPASS || !quoteId) return;
    setLoading(true);
    setError(null);

    try {
      const [quoteRes, linesRes, activitiesRes] = await Promise.all([
        billingDb
          .from("quotes")
          .select(
            `id, quote_number, quote_kind, quote_status, quote_date, expiry_date,
             sent_at, signed_at, version_number, previous_quote_id,
             total_ht, total_vat, total_ttc, project_id,
             customer:customer_id (id, name, email, phone),
             property:property_id (id, address_line1, address_line2, city, postal_code)`
          )
          .eq("id", quoteId)
          .single(),

        billingDb
          .from("quote_lines")
          .select(
            `id, label, qty, unit, unit_price_ht, vat_rate, total_line_ht, sort_order, metadata,
             product:product_id (id, name, sku)`
          )
          .eq("quote_id", quoteId)
          .order("sort_order", { ascending: true }),

        coreDb
          .from("activities")
          .select(`id, activity_type, payload, occurred_at, actor:actor_user_id (full_name)`)
          .eq("scope_type", "quote")
          .eq("scope_id", quoteId)
          .order("occurred_at", { ascending: false })
          .limit(10),
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
        project_id: q.project_id,
        previous_quote_id: q.previous_quote_id,
        customer: q.customer ?? { id: "", name: "Client inconnu", email: null, phone: null },
        property: q.property ?? null,
      });

      setLines(
        (linesRes.data ?? []).map((l: any) => ({
          id: l.id,
          label: l.label,
          qty: Number(l.qty) || 0,
          unit: l.unit,
          unit_price_ht: Number(l.unit_price_ht) || 0,
          vat_rate: Number(l.vat_rate) || 0,
          total_line_ht: Number(l.total_line_ht) || 0,
          sort_order: l.sort_order,
          metadata: l.metadata,
          product: l.product ?? null,
        }))
      );

      setActivities(
        (activitiesRes.data ?? []).map((a: any) => ({
          id: a.id,
          activity_type: a.activity_type,
          payload: a.payload,
          occurred_at: a.occurred_at,
          actor: a.actor ?? null,
        }))
      );
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (!DEV_BYPASS) fetchQuote();
  }, [fetchQuote]);

  return { quote, lines, activities, loading, error, refetch: fetchQuote };
}
