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
  kpis: {
    revenue: { value: 18247, label: "CA du mois" },
    quotes: { count: 5, overdue: 2, label: "Devis en attente" },
    interventions: { count: 11, installation: 8, service: 3, label: "Interventions S.13" },
    overdue: { count: 2, amount: 4620, label: "Impayées > 30j" },
  },
  pipeline: [
    { id: "1", project_number: "PRJ-0047", status: "vt_planned", modified_at: new Date().toISOString(), customer_name: "M. Morel" },
    { id: "2", project_number: "PRJ-0045", status: "final_quote_sent", modified_at: new Date().toISOString(), customer_name: "Mme Durand" },
    { id: "3", project_number: "PRJ-0043", status: "deposit_paid", modified_at: new Date().toISOString(), customer_name: "M. Fabre" },
  ],
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
          // KPI 1: Revenue this month
          billingDb
            .from("invoices")
            .select("total_ttc")
            .in("invoice_status", ["paid", "partial"])
            .gte("invoice_date", monthStart)
            .lte("invoice_date", today),

          // KPI 2: Pending quotes count
          billingDb
            .from("quotes")
            .select("id, expiry_date")
            .in("quote_status", ["draft", "sent"]),

          // KPI 2b: Overdue quotes
          billingDb
            .from("quotes")
            .select("id", { count: "exact", head: true })
            .in("quote_status", ["draft", "sent"])
            .lt("expiry_date", today),

          // KPI 3: Interventions this week
          operationsDb
            .from("interventions")
            .select("id, workstream")
            .gte("start_datetime", weekStart)
            .lte("start_datetime", weekEnd),

          // KPI 4: Overdue invoices > 30 days
          billingDb
            .from("invoices")
            .select("id, total_ttc")
            .in("invoice_status", ["sent", "overdue", "partial"])
            .lt("due_date", thirtyDaysAgo),

          // Pipeline: active projects with customer name
          coreDb
            .from("projects")
            .select("id, project_number, status, modified_at, customer:customer_id(name)")
            .not("status", "in", "(closed,lost,cancelled)")
            .order("modified_at", { ascending: false })
            .limit(10),
        ]);

      // Check for errors
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

      // Process revenue
      const revenueTotal = (revenueRes.data ?? []).reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_ttc) || 0),
        0
      );

      // Process quotes
      const quotesData = quotesRes.data ?? [];
      const overdueCount = overdueQuotesRes.count ?? 0;

      // Process interventions
      const interventionsData = interventionsRes.data ?? [];
      const installCount = interventionsData.filter(
        (i: any) => i.workstream === "project_installation"
      ).length;
      const serviceCount = interventionsData.filter(
        (i: any) => i.workstream === "aftercare_service"
      ).length;

      // Process overdue invoices
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

      // Process pipeline
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
