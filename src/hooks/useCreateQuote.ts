import { useState, useCallback } from "react";
import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface QuoteLine {
  id: string;
  quote_id: string;
  product_id: string | null;
  label: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  sort_order: number;
  total_line_ht: number;
}

export interface QuoteSummary {
  id: string;
  quote_number: string;
  quote_kind: string;
  quote_status: string;
  quote_date: string;
  expiry_date: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  customer_id: string;
  property_id: string;
  project_id: string;
}

interface NewLineInput {
  product_id?: string | null;
  label: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  sort_order: number;
}

export function useCreateQuote() {
  const { tenantId } = useCurrentUser();
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchQuote = useCallback(async (quoteId: string) => {
    const { data } = await billingDb
      .from("quotes")
      .select("id, quote_number, quote_kind, quote_status, quote_date, expiry_date, total_ht, total_vat, total_ttc, customer_id, property_id, project_id")
      .eq("id", quoteId)
      .single();
    if (data) setQuote(data as QuoteSummary);
  }, []);

  const refetchLines = useCallback(async (quoteId: string) => {
    const { data } = await billingDb
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true });
    if (data) setLines(data as QuoteLine[]);
  }, []);

  const createQuote = useCallback(async (projectId: string, quoteKind: string = "estimate") => {
    setError(null);
    setSaving(true);

    try {
      const { data: proj, error: projErr } = await coreDb
        .from("v_projects_with_customer")
        .select("customer_id, property_id")
        .eq("id", projectId)
        .single();
      if (projErr) throw projErr;

      const today = new Date();
      const expiry = new Date(today.getTime() + 30 * 86400000);

      const { data: newQuote, error: quoteErr } = await billingDb
        .from("quotes")
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          customer_id: proj.customer_id,
          property_id: proj.property_id,
          quote_kind: quoteKind,
          quote_status: "draft",
          quote_date: today.toISOString().split("T")[0],
          expiry_date: expiry.toISOString().split("T")[0],
          version_number: 1,
        })
        .select("id, quote_number, quote_kind, quote_status, quote_date, expiry_date, total_ht, total_vat, total_ttc, customer_id, property_id, project_id")
        .single();

      if (quoteErr) throw quoteErr;
      const q = newQuote as QuoteSummary;
      setQuote(q);
      setLines([]);
      return q;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du devis");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const addLine = useCallback(async (quoteId: string, line: NewLineInput) => {
    setSaving(true);
    setError(null);

    try {
      const { error: err } = await billingDb
        .from("quote_lines")
        .insert({
          tenant_id: tenantId,
          quote_id: quoteId,
          product_id: line.product_id || null,
          label: line.label,
          qty: line.qty,
          unit: line.unit,
          unit_price_ht: line.unit_price_ht,
          vat_rate: line.vat_rate,
          sort_order: line.sort_order,
          metadata: {},
        });
      if (err) throw err;
      await Promise.all([refetchQuote(quoteId), refetchLines(quoteId)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [refetchQuote, refetchLines]);

  const updateLine = useCallback(async (lineId: string, quoteId: string, changes: Partial<QuoteLine>) => {
    setSaving(true);
    setError(null);

    try {
      const { error: err } = await billingDb
        .from("quote_lines")
        .update(changes)
        .eq("id", lineId);
      if (err) throw err;
      await Promise.all([refetchQuote(quoteId), refetchLines(quoteId)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [refetchQuote, refetchLines]);

  const deleteLine = useCallback(async (lineId: string, quoteId: string) => {
    setSaving(true);
    setError(null);

    try {
      const { error: err } = await billingDb
        .from("quote_lines")
        .delete()
        .eq("id", lineId);
      if (err) throw err;
      await Promise.all([refetchQuote(quoteId), refetchLines(quoteId)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [refetchQuote, refetchLines]);

  return { createQuote, addLine, updateLine, deleteLine, quote, lines, saving, error, setQuote };
}
