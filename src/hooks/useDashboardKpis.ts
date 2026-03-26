import { useState, useEffect, useCallback } from "react";
import { billingDb, operationsDb, coreDb } from "@/integrations/supabase/schema-clients";
import {
  startOfMonth,
  startOfWeek,
  endOfWeek,
  getISOWeek,
  subDays,
  formatISO,
} from "date-fns";
import { MOCK_DASHBOARD_KPIS, MOCK_PIPELINE } from "@/mocks/data";

interface RevenueKpi {
  value: number;
  label: string;
}

interface QuotesKpi {
  count: number;
  overdue: number;
  label: string;
}

interface InterventionsKpi {
  count: number;
  installation: number;
  service: number;
  label: string;
}

interface OverdueKpi {
  count: number;
  amount: number;
  label: string;
}

interface PipelineProject {
  id: string;
  project_number: string;
  status: string;
  modified_at: string;
  customer_name: string;
}

export interface DashboardKpis {
  revenue: RevenueKpi;
  quotes: QuotesKpi;
  interventions: InterventionsKpi;
  overdue: OverdueKpi;
}

interface UseDashboardKpisReturn {
  kpis: DashboardKpis | null;
  pipeline: PipelineProject[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

const DEV_MOCK: UseDashboardKpisReturn = {
  kpis: MOCK_DASHBOARD_KPIS,
  pipeline: MOCK_PIPELINE,
  loading: false,
  error: null,
  refetch: () => {},
};

export function useDashboardKpis(): UseDashboardKpisReturn {
  if (DEV_BYPASS) return DEV_MOCK;

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [pipeline, setPipeline] = useState<PipelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const monthStart = formatISO(startOfMonth(now), { representation: "date" });
      const today = formatISO(now, { representation: "date" });
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const thirtyDaysAgo = formatISO(subDays(now, 30), { representation: "date" });
      const isoWeek = getISOWeek(now);

      const [revenueRes, quotesRes, overdueQuotesRes, interventionsRes, overdueInvoicesRes, pipelineRes] =
        await Promise.all([
          billingDb
            .from("invoices")
            .select("total_ttc")
            .in("invoice_status", ["paid", "partial"])
            .gte("invoice_date", monthStart)
            .lte("invoice_date", today),

          billingDb
            .from("quotes")
            .select("id, expiry_date")
            .in("quote_status", ["draft", "sent"]),

          billingDb
            .from("quotes")
            .select("id", { count: "exact", head: true })
            .in("quote_status", ["draft", "sent"])
            .lt("expiry_date", today),

          operationsDb
            .from("interventions")
            .select("id, workstream")
            .gte("start_datetime", weekStart)
            .lte("start_datetime", weekEnd),

          billingDb
            .from("invoices")
            .select("id, total_ttc")
            .in("invoice_status", ["sent", "overdue", "partial"])
            .lt("due_date", thirtyDaysAgo),

          coreDb
            .from("projects")
            .select("id, project_number, status, modified_at, customer:customer_id(name)")
            .not("status", "in", "(closed,lost,cancelled)")
            .order("modified_at", { ascending: false })
            .limit(10),
        ]);

      const errors = [revenueRes, quotesRes, overdueQuotesRes, interventionsRes, overdueInvoicesRes, pipelineRes]
        .filter((r) => r.error)
        .map((r) => r.error?.message);

      if (errors.length > 0) {
        setError(errors[0] ?? "Erreur lors du chargement des données");
        setKpis(null);
        setPipeline([]);
        setLoading(false);
        return;
      }

      const revenueTotal = (revenueRes.data ?? []).reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_ttc) || 0),
        0
      );

      const quotesData = quotesRes.data ?? [];
      const overdueCount = overdueQuotesRes.count ?? 0;

      const interventionsData = interventionsRes.data ?? [];
      const installCount = interventionsData.filter(
        (i: any) => i.workstream === "project_installation"
      ).length;
      const serviceCount = interventionsData.filter(
        (i: any) => i.workstream === "aftercare_service"
      ).length;

      const overdueInvoices = overdueInvoicesRes.data ?? [];
      const overdueAmount = overdueInvoices.reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_ttc) || 0),
        0
      );

      setKpis({
        revenue: { value: revenueTotal, label: "CA du mois" },
        quotes: {
          count: quotesData.length,
          overdue: overdueCount,
          label: "Devis en attente",
        },
        interventions: {
          count: interventionsData.length,
          installation: installCount,
          service: serviceCount,
          label: `Interventions S.${isoWeek}`,
        },
        overdue: {
          count: overdueInvoices.length,
          amount: overdueAmount,
          label: "Impayées > 30j",
        },
      });

      const pipelineProjects: PipelineProject[] = (pipelineRes.data ?? []).map(
        (p: any) => ({
          id: p.id,
          project_number: p.project_number,
          status: p.status,
          modified_at: p.modified_at,
          customer_name: p.customer?.name ?? "Client inconnu",
        })
      );
      setPipeline(pipelineProjects);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
      setKpis(null);
      setPipeline([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpis();
    const interval = setInterval(fetchKpis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchKpis]);

  return { kpis, pipeline, loading, error, refetch: fetchKpis };
}
