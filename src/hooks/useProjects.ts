import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { MOCK_PROJECTS as CENTRAL_MOCK_PROJECTS } from "@/mocks/data";

export type ProjectStatus =
  | "lead_new"
  | "lead_qualified"
  | "vt_planned"
  | "vt_done"
  | "tech_review_done"
  | "estimate_sent"
  | "final_quote_sent"
  | "signed"
  | "deposit_paid"
  | "supplier_ordered"
  | "material_received"
  | "installation_scheduled"
  | "mes_done"
  | "closed"
  | "on_hold"
  | "lost"
  | "cancelled";

export type StatusFilter = "active" | "archived";

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  active: "Actifs",
  archived: "Archivés",
};

const ARCHIVED_STATUSES: ProjectStatus[] = ["lost", "cancelled", "on_hold"];
const CLOSED_STATUSES: ProjectStatus[] = ["closed", ...ARCHIVED_STATUSES];

export const KANBAN_COLUMNS = [
  { key: "leads", label: "Leads", statuses: ["lead_new", "lead_qualified"] as ProjectStatus[] },
  { key: "devis_estimatif", label: "Devis estimatif", statuses: ["estimate_sent"] as ProjectStatus[] },
  { key: "vt", label: "Visite technique", statuses: ["vt_planned", "vt_done", "tech_review_done"] as ProjectStatus[] },
  { key: "devis_final", label: "Devis final", statuses: ["final_quote_sent"] as ProjectStatus[] },
  { key: "signed", label: "Signé", statuses: ["signed", "deposit_paid"] as ProjectStatus[] },
  { key: "en_cours", label: "En cours", statuses: ["supplier_ordered", "material_received", "installation_scheduled"] as ProjectStatus[] },
  { key: "finalisation", label: "Finalisation", statuses: ["mes_done"] as ProjectStatus[] },
] as const;

export interface Project {
  id: string;
  project_number: string;
  status: ProjectStatus;
  origin: string;
  customer_name: string;
  city: string;
  created_at: string;
  modified_at: string;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_PROJECTS: Project[] = CENTRAL_MOCK_PROJECTS.map((p) => ({
  id: p.id,
  project_number: p.project_number,
  status: p.status as ProjectStatus,
  origin: p.origin,
  customer_name: p.customer.name,
  city: p.property.city,
  created_at: p.created_at,
  modified_at: p.modified_at,
}));

function filterMock(search: string, filter: StatusFilter): Project[] {
  let list = MOCK_PROJECTS;

  if (filter === "active") {
    list = list.filter((p) => !CLOSED_STATUSES.includes(p.status));
  } else {
    list = list.filter((p) => ARCHIVED_STATUSES.includes(p.status));
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.customer_name.toLowerCase().includes(q) ||
        p.project_number.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
    );
  }
  return list;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>(DEV_BYPASS ? filterMock("", "active") : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const fetchProjects = useCallback(async () => {
    if (DEV_BYPASS) return;
    setLoading(true);
    setError(null);

    try {
      let query = coreDb
        .from("projects")
        .select("id, project_number, status, origin, modified_at, created_at, customer:customer_id(name), property:property_id(city)")
        .order("modified_at", { ascending: false })
        .limit(200);

      if (statusFilter === "active") {
        query = query.not("status", "in", `(${CLOSED_STATUSES.join(",")})`);
      } else {
        query = query.in("status", ARCHIVED_STATUSES);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      let mapped: Project[] = (data ?? []).map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        status: p.status,
        origin: p.origin,
        customer_name: p.customer?.name ?? "Client inconnu",
        city: p.property?.city ?? "—",
        created_at: p.created_at,
        modified_at: p.modified_at,
      }));

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        mapped = mapped.filter(
          (p) =>
            p.customer_name.toLowerCase().includes(q) ||
            p.project_number.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q)
        );
      }

      setProjects(mapped);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (DEV_BYPASS) {
      setProjects(filterMock(search, statusFilter));
      return;
    }

    const debounce = setTimeout(fetchProjects, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, fetchProjects]);

  return {
    projects,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refetch: fetchProjects,
  };
}
