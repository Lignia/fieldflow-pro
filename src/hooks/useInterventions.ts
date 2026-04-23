import { useCallback, useEffect, useMemo, useState } from "react";
import { operationsDb } from "@/integrations/supabase/schema-clients";

export type InterventionType =
  | "sweep"
  | "annual_service"
  | "repair"
  | "diagnostic"
  | "commissioning"
  | "installation"
  | "commercial_visit"
  | "technical_survey";

export type InterventionStatus =
  | "planned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type InterventionWorkstream =
  | "project_installation"
  | "aftercare_service";

export type InterventionActiveFilter =
  | "all"
  | "today"
  | "project"
  | "aftercare";

export interface Intervention {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  property_id: string | null;
  service_request_id: string | null;
  project_id: string | null;
  installation_id: string | null;
  assigned_to: string | null;
  workstream: InterventionWorkstream | null;
  intervention_type: InterventionType;
  status: InterventionStatus;
  start_datetime: string | null;
  end_datetime: string | null;
  internal_notes: string | null;
  customer_visible_notes: string | null;
  certificate_number: string | null;
  rescheduled_from_id: string | null;
  created_at: string;
  modified_at: string;
  // Rapport terrain & suivi
  report_notes: string | null;
  followup_needed: boolean | null;
  followup_notes: string | null;
  quote_needed: boolean | null;
  sweep_type: string | null;
  flue_condition: string | null;
  parts_replaced: string | null;
  next_service_recommendation: string | null;
  actual_start_datetime: string | null;
  actual_end_datetime: string | null;
  // Dénormalisé
  customer_name: string | null;
  customer_phone: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  assigned_to_name: string | null;
  device_type: string | null;
  brand: string | null;
  model: string | null;
  device_category: string | null;
  project_number: string | null;
  project_status: string | null;
  request_category: string | null;
  service_request_priority: string | null;
}

interface UseInterventionsReturn {
  interventions: Intervention[];
  filtered: Intervention[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (s: string) => void;
  activeFilter: InterventionActiveFilter;
  setActiveFilter: (f: InterventionActiveFilter) => void;
  counts: {
    all: number;
    today: number;
    project: number;
    aftercare: number;
  };
  refetch: () => void;
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function useInterventions(): UseInterventionsReturn {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<InterventionActiveFilter>("all");

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await operationsDb
      .from("v_interventions_with_context")
      .select("*")
      .order("start_datetime", { ascending: true })
      .limit(200);
    if (err) {
      setError(err.message);
      setInterventions([]);
    } else {
      // Sort: items with date asc first, then null dates last
      const list = (data ?? []) as Intervention[];
      list.sort((a, b) => {
        if (!a.start_datetime && !b.start_datetime) return 0;
        if (!a.start_datetime) return 1;
        if (!b.start_datetime) return -1;
        return (
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
        );
      });
      setInterventions(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const counts = useMemo(
    () => ({
      all: interventions.length,
      today: interventions.filter((i) => isToday(i.start_datetime)).length,
      project: interventions.filter(
        (i) => i.workstream === "project_installation",
      ).length,
      aftercare: interventions.filter(
        (i) => i.workstream === "aftercare_service",
      ).length,
    }),
    [interventions],
  );

  const filtered = useMemo(() => {
    let list = interventions;
    switch (activeFilter) {
      case "today":
        list = list.filter((i) => isToday(i.start_datetime));
        break;
      case "project":
        list = list.filter((i) => i.workstream === "project_installation");
        break;
      case "aftercare":
        list = list.filter((i) => i.workstream === "aftercare_service");
        break;
    }
    if (debouncedSearch) {
      list = list.filter((i) =>
        (i.customer_name ?? "").toLowerCase().includes(debouncedSearch),
      );
    }
    return list;
  }, [interventions, activeFilter, debouncedSearch]);

  return {
    interventions,
    filtered,
    loading,
    error,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    counts,
    refetch: fetchAll,
  };
}
