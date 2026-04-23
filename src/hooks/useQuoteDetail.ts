import { useState, useEffect, useCallback } from "react";
import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";

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
  product_id: string | null;
  metadata: Record<string, unknown> | null;
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

export interface QuoteDepositInvoice {
  id: string;
  invoice_number: string;
  invoice_status: string;
}

export interface QuoteInstallation {
  id: string;
  status: string;
  device_type: string | null;
}

export interface QuoteTechnicalSurvey {
  id: string;
  survey_status: string;
}

export interface QuoteActivity {
  id: string;
  activity_type: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
  actor_user_id: string | null;
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
  tenant_id: string;
  service_request_id: string | null;
  installation_id: string | null;
  customer: QuoteDetailCustomer;
  property: QuoteDetailProperty | null;
}

interface UseQuoteDetailReturn {
  quote: QuoteDetailData | null;
  lines: QuoteLine[];
  activities: QuoteActivity[];
  project: QuoteDetailProject | null;
  depositInvoice: QuoteDepositInvoice | null;
  installation: QuoteInstallation | null;
  technicalSurvey: QuoteTechnicalSurvey | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuoteDetail(quoteId: string | undefined): UseQuoteDetailReturn {
  const [quote, setQuote] = useState<QuoteDetailData | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [activities, setActivities] = useState<QuoteActivity[]>([]);
  const [project, setProject] = useState<QuoteDetailProject | null>(null);
  const [depositInvoice, setDepositInvoice] = useState<QuoteDepositInvoice | null>(null);
  const [installation, setInstallation] = useState<QuoteInstallation | null>(null);
  const [technicalSurvey, setTechnicalSurvey] = useState<QuoteTechnicalSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!quoteId) return;
    setLoading(true);
    setError(null);

    try {
      const [quoteRes, linesRes, activitiesRes] = await Promise.all([
        billingDb
          .from("v_quotes_with_customer")
          .select("*")
          .eq("id", quoteId)
          .single(),

        billingDb
          .from("quote_lines")
          .select("id, label, qty, unit, unit_price_ht, vat_rate, total_line_ht, sort_order, product_id, metadata")
          .eq("quote_id", quoteId)
          .order("sort_order", { ascending: true }),

        coreDb
          .from("activities")
          .select("id, activity_type, payload, occurred_at, actor_user_id")
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
      const quoteData: QuoteDetailData = {
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
        tenant_id: q.tenant_id,
        service_request_id: q.service_request_id ?? null,
        installation_id: q.installation_id ?? null,
        customer: {
          id: q.customer_id ?? "",
          name: q.customer_name ?? "Client inconnu",
          email: q.customer_email ?? null,
          phone: q.customer_phone ?? null,
        },
        property: q.property_id
          ? {
              id: q.property_id,
              address_line1: q.address_line1 ?? null,
              address_line2: q.address_line2 ?? null,
              city: q.city ?? null,
              postal_code: q.postal_code ?? null,
            }
          : null,
      };
      setQuote(quoteData);

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
          product_id: l.product_id ?? null,
        }))
      );

      setActivities(
        (activitiesRes.data ?? []).map((a: any) => ({
          id: a.id,
          activity_type: a.activity_type,
          payload: a.payload,
          occurred_at: a.occurred_at,
          actor_user_id: a.actor_user_id ?? null,
        }))
      );

      // Fetch project / deposit invoice / installation / technical survey IN PARALLEL
      const projectPromise = q.project_id
        ? coreDb.from("projects").select("id, project_number, status").eq("id", q.project_id).single()
        : Promise.resolve({ data: null, error: null } as any);

      const depositPromise = q.quote_status === "signed"
        ? billingDb.from("invoices").select("id, invoice_number, invoice_status").eq("quote_id", quoteId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any);

      const installationPromise = q.project_id && q.tenant_id
        ? coreDb.from("installations").select("id, status, device_type").eq("project_id", q.project_id).eq("tenant_id", q.tenant_id).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any);

      const surveyPromise = q.project_id && q.tenant_id && (q.quote_kind === "estimate" || q.quote_kind === "final")
        ? coreDb.from("technical_surveys").select("id, survey_status").eq("project_id", q.project_id).eq("tenant_id", q.tenant_id).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any);

      const [projRes, invRes, instRes, surveyRes] = await Promise.all([
        projectPromise,
        depositPromise,
        installationPromise,
        surveyPromise,
      ]);

      const projData = projRes.data as any;
      setProject(projData ? { id: projData.id, project_number: projData.project_number, status: projData.status } : null);

      const invData = invRes.data as any;
      setDepositInvoice(invData ? {
        id: invData.id,
        invoice_number: invData.invoice_number,
        invoice_status: invData.invoice_status,
      } : null);

      const instData = instRes.data as any;
      setInstallation(instData ? {
        id: instData.id,
        status: instData.status,
        device_type: instData.device_type ?? null,
      } : null);

      const surveyData = surveyRes.data as any;
      setTechnicalSurvey(surveyData ? {
        id: surveyData.id,
        survey_status: surveyData.survey_status,
      } : null);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return { quote, lines, activities, project, depositInvoice, installation, technicalSurvey, loading, error, refetch: fetchQuote };
}
