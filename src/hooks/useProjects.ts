import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

// Exact enum from core.project_status
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

export const ALL_PROJECT_STATUSES: ProjectStatus[] = [
  "lead_new",
  "lead_qualified",
  "vt_planned",
  "vt_done",
  "tech_review_done",
  "estimate_sent",
  "final_quote_sent",
  "signed",
  "deposit_paid",
  "supplier_ordered",
  "material_received",
  "installation_scheduled",
  "mes_done",
  "closed",
  "on_hold",
  "lost",
  "cancelled",
];

/** Logical groupings for filter tabs */
export const STATUS_GROUPS = {
  all: null as ProjectStatus[] | null,
  leads: ["lead_new", "lead_qualified"] as ProjectStatus[],
  commercial: [
    "vt_planned",
    "vt_done",
    "tech_review_done",
    "estimate_sent",
    "final_quote_sent",
  ] as ProjectStatus[],
  signed: [
    "signed",
    "deposit_paid",
    "supplier_ordered",
    "material_received",
    "installation_scheduled",
    "mes_done",
  ] as ProjectStatus[],
  closed: ["closed", "lost", "cancelled", "on_hold"] as ProjectStatus[],
};

export type StatusGroup = keyof typeof STATUS_GROUPS;

export const STATUS_GROUP_LABELS: Record<StatusGroup, string> = {
  all: "Tous",
  leads: "Leads",
  commercial: "Commercial",
  signed: "En cours",
  closed: "Terminés",
};

export interface Project {
  id: string;
  project_number: string;
  status: ProjectStatus;
  origin: string;
  customer_name: string;
  created_at: string;
  modified_at: string;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  statusGroup: StatusGroup;
  setStatusGroup: (g: StatusGroup) => void;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_PROJECTS: Project[] = [
  {
    id: "mock-p1",
    project_number: "PRJ-0047",
    status: "vt_planned",
    origin: "web",
    customer_name: "M. Morel",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "mock-p2",
    project_number: "PRJ-0046",
    status: "lead_new",
    origin: "phone",
    customer_name: "Mme Lefèvre",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "mock-p3",
    project_number: "PRJ-0045",
    status: "final_quote_sent",
    origin: "referral",
    customer_name: "Mme Durand",
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "mock-p4",
    project_number: "PRJ-0044",
    status: "signed",
    origin: "web",
    customer_name: "M. Bernard",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "mock-p5",
    project_number: "PRJ-0043",
    status: "deposit_paid",
    origin: "manual",
    customer_name: "M. Fabre",
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "mock-p6",
    project_number: "PRJ-0042",
    status: "installation_scheduled",
    origin: "showroom",
    customer_name: "Mme Petit",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "mock-p7",
    project_number: "PRJ-0041",
    status: "closed",
    origin: "referral",
    customer_name: "M. Roux",
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "mock-p8",
    project_number: "PRJ-0040",
    status: "lost",
    origin: "web",
    customer_name: "M. Garcia",
    created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

function filterMock(search: string, group: StatusGroup): Project[] {
  let list = MOCK_PROJECTS;
  const statuses = STATUS_GROUPS[group];
  if (statuses) {
    list = list.filter((p) => (statuses as string[]).includes(p.status));
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.customer_name.toLowerCase().includes(q) ||
        p.project_number.toLowerCase().includes(q)
    );
  }
  return list;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>(DEV_BYPASS ? MOCK_PROJECTS : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusGroup, setStatusGroup] = useState<StatusGroup>("all");

  const fetchProjects = useCallback(async () => {
    if (DEV_BYPASS) return;
    setLoading(true);
    setError(null);

    try {
      let query = coreDb
        .from("projects")
        .select("id, project_number, status, origin, modified_at, created_at, customer:customer_id(name)")
        .order("modified_at", { ascending: false })
        .limit(200);

      // Apply status filter
      const statuses = STATUS_GROUPS[statusGroup];
      if (statuses) {
        query = query.in("status", statuses);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const mapped: Project[] = (data ?? []).map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        status: p.status,
        origin: p.origin,
        customer_name: p.customer?.name ?? "Client inconnu",
        created_at: p.created_at,
        modified_at: p.modified_at,
      }));

      // Client-side search filter (name/project_number)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        setProjects(
          mapped.filter(
            (p) =>
              p.customer_name.toLowerCase().includes(q) ||
              p.project_number.toLowerCase().includes(q)
          )
        );
      } else {
        setProjects(mapped);
      }
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [search, statusGroup]);

  useEffect(() => {
    if (DEV_BYPASS) {
      setProjects(filterMock(search, statusGroup));
      return;
    }

    const debounce = setTimeout(fetchProjects, 300);
    return () => clearTimeout(debounce);
  }, [search, statusGroup, fetchProjects]);

  return {
    projects,
    loading,
    error,
    search,
    setSearch,
    statusGroup,
    setStatusGroup,
    refetch: fetchProjects,
  };
}
