import { useState, useCallback } from "react";
import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

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

function mockQuote(projectId: string): QuoteSummary {
  return {
    id: "quote-dev-1",
    quote_number: "DEV-2026-0001",
    quote_kind: "estimate",
    quote_status: "draft",
    quote_date: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    total_ht: 0,
    total_vat: 0,
    total_ttc: 0,
    customer_id: "cust-1",
    property_id: "prop-1",
    project_id: projectId,
  };
}

export function useCreateQuote() {
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchQuote = useCallback(async (quoteId: string) => {
    if (DEV_BYPASS) return;
    const { data } = await billingDb
      .from("quotes")
      .select("id, quote_number, quote_kind, quote_status, quote_date, expiry_date, total_ht, total_vat, total_ttc, customer_id, property_id, project_id")
      .eq("id", quoteId)
      .single();
    if (data) setQuote(data as QuoteSummary);
  }, []);

  const refetchLines = useCallback(async (quoteId: string) => {
    if (DEV_BYPASS) return;
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

    if (DEV_BYPASS) {
      const mock = mockQuote(projectId);
      mock.quote_kind = quoteKind;
      setQuote(mock);
      setLines([]);
      setSaving(false);
      return mock;
    }

    try {
      // 1. Get project context
      const { data: proj, error: projErr } = await coreDb
        .from("projects")
        .select("customer_id, property_id")
        .eq("id", projectId)
        .single();
      if (projErr) throw projErr;

      const today = new Date();
      const expiry = new Date(today.getTime() + 30 * 86400000);

      // 2. Insert quote
      const { data: newQuote, error: quoteErr } = await billingDb
        .from("quotes")
        .insert({
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

    if (DEV_BYPASS) {
      const mockLine: QuoteLine = {
        id: crypto.randomUUID(),
        quote_id: quoteId,
        product_id: line.product_id || null,
        label: line.label,
        qty: line.qty,
        unit: line.unit,
        unit_price_ht: line.unit_price_ht,
        vat_rate: line.vat_rate,
        sort_order: line.sort_order,
        total_line_ht: line.qty * line.unit_price_ht,
      };
      setLines((prev) => [...prev, mockLine]);
      setQuote((prev) => {
        if (!prev) return prev;
        const allLines = [...lines, mockLine];
        const ht = allLines.reduce((s, l) => s + l.total_line_ht, 0);
        const vat = allLines.reduce((s, l) => s + l.total_line_ht * (l.vat_rate / 100), 0);
        return { ...prev, total_ht: ht, total_vat: vat, total_ttc: ht + vat };
      });
      setSaving(false);
      return mockLine;
    }

    try {
      const { error: err } = await billingDb
        .from("quote_lines")
        .insert({
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
  }, [lines, refetchQuote, refetchLines]);

  const updateLine = useCallback(async (lineId: string, quoteId: string, changes: Partial<QuoteLine>) => {
    setSaving(true);
    setError(null);

    if (DEV_BYPASS) {
      setLines((prev) => {
        const updated = prev.map((l) => {
          if (l.id !== lineId) return l;
          const merged = { ...l, ...changes };
          merged.total_line_ht = merged.qty * merged.unit_price_ht;
          return merged;
        });
        // Recalc totals
        const ht = updated.reduce((s, l) => s + l.total_line_ht, 0);
        const vat = updated.reduce((s, l) => s + l.total_line_ht * (l.vat_rate / 100), 0);
        setQuote((prev) => prev ? { ...prev, total_ht: ht, total_vat: vat, total_ttc: ht + vat } : prev);
        return updated;
      });
      setSaving(false);
      return;
    }

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

    if (DEV_BYPASS) {
      setLines((prev) => {
        const updated = prev.filter((l) => l.id !== lineId);
        const ht = updated.reduce((s, l) => s + l.total_line_ht, 0);
        const vat = updated.reduce((s, l) => s + l.total_line_ht * (l.vat_rate / 100), 0);
        setQuote((p) => p ? { ...p, total_ht: ht, total_vat: vat, total_ttc: ht + vat } : p);
        return updated;
      });
      setSaving(false);
      return;
    }

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
