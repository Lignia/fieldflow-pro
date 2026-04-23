import { useState, useEffect, useCallback } from "react";
import { coreDb, billingDb } from "@/integrations/supabase/schema-clients";
import type { ProjectStatus } from "@/hooks/useProjects";

export interface ProjectCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customer_type: string;
}

export interface ProjectProperty {
  id: string;
  label: string | null;
  address_line1: string;
  address_line2: string | null;
  postal_code: string;
  city: string;
  property_type: string | null;
}

export interface ProjectQuote {
  id: string;
  quote_number: string;
  quote_kind: string;
  quote_status: string;
  total_ttc: number;
  quote_date: string;
  expiry_date: string;
}

export interface ProjectInvoice {
  id: string;
  invoice_number: string;
  invoice_kind: string;
  invoice_status: string;
  total_ttc: number;
  invoice_date: string;
  due_date: string;
}

export interface ProjectDetail {
  id: string;
  project_number: string;
  status: ProjectStatus;
  origin: string;
  cancellation_reason: string | null;
  closed_at: string | null;
  created_at: string;
  modified_at: string;
  customer: ProjectCustomer;
  property: ProjectProperty;
  quotes: ProjectQuote[];
  invoices: ProjectInvoice[];
  payload: Record<string, any>;
  pipeline_value_ttc: number;
  pipeline_value_source: string | null;
}

interface UseProjectDetailReturn {
  project: ProjectDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectDetail(projectId: string | undefined): UseProjectDetailReturn {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const [projectRes, quotesRes, invoicesRes] = await Promise.all([
        coreDb
          .from("v_projects_with_customer")
          .select("*")
          .eq("id", projectId)
          .single(),

        billingDb
          .from("quotes")
          .select("id, quote_number, quote_kind, quote_status, total_ttc, quote_date, expiry_date")
          .eq("project_id", projectId)
          .order("quote_date", { ascending: false }),

        billingDb
          .from("invoices")
          .select("id, invoice_number, invoice_kind, invoice_status, total_ttc, invoice_date, due_date")
          .eq("project_id", projectId)
          .order("invoice_date", { ascending: false }),
      ]);

      if (projectRes.error) {
        setError(projectRes.error.message);
        return;
      }

      const p = projectRes.data as any;

      setProject({
        id: p.id,
        project_number: p.project_number,
        status: p.status,
        origin: p.origin,
        cancellation_reason: p.cancellation_reason,
        closed_at: p.closed_at,
        created_at: p.created_at,
        modified_at: p.modified_at,
        payload: (p.payload ?? {}) as Record<string, any>,
        pipeline_value_ttc: Number(p.pipeline_value_ttc) || 0,
        pipeline_value_source: p.pipeline_value_source ?? null,
        customer: {
          id: p.customer_id ?? "",
          name: p.customer_name ?? "Client inconnu",
          email: p.customer_email ?? null,
          phone: p.customer_phone ?? null,
          customer_type: p.customer_type ?? "particulier",
        },
        property: {
          id: p.property_id ?? "",
          label: p.property_label ?? null,
          address_line1: p.address_line1 ?? "—",
          address_line2: p.address_line2 ?? null,
          postal_code: p.postal_code ?? "",
          city: p.city ?? "—",
          property_type: p.property_type ?? null,
        },
        quotes: (quotesRes.data ?? []).map((q: any) => ({
          ...q,
          total_ttc: Number(q.total_ttc) || 0,
        })),
        invoices: (invoicesRes.data ?? []).map((i: any) => ({
          ...i,
          total_ttc: Number(i.total_ttc) || 0,
        })),
      });
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { project, loading, error, refetch: fetchProject };
}
