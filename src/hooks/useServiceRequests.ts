import { useCallback, useEffect, useMemo, useState } from "react";
import { operationsDb } from "@/integrations/supabase/schema-clients";

export type ServiceRequestStatus =
  | "new"
  | "qualified"
  | "scheduled"
  | "in_progress"
  | "closed"
  | "cancelled";

export type ServiceRequestPriority = "low" | "medium" | "high" | "critical";

export type ServiceRequestCategory =
  | "breakdown"
  | "sweep"
  | "annual_service"
  | "warranty_claim"
  | "commercial"
  | "other";

export type ServiceRequestChannel =
  | "phone"
  | "email"
  | "sms"
  | "web_form"
  | "in_person"
  | "app";

export type ServiceRequestResolutionMode =
  | "phone_resolved"
  | "intervention_needed"
  | "no_action";

export type ServiceRequestActiveFilter =
  | "all"
  | "open"
  | "critical"
  | "sweep"
  | "maintenance";

export interface ServiceRequest {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  property_id: string | null;
  installation_id: string | null;
  status: ServiceRequestStatus;
  request_type: string | null;
  request_category: ServiceRequestCategory | null;
  priority: ServiceRequestPriority;
  channel: ServiceRequestChannel | null;
  notes: string | null;
  resolution_mode: ServiceRequestResolutionMode | null;
  resolved_at: string | null;
  requested_at: string;
  modified_at: string;
  // Dénormalisé
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address_line1: string | null;
  city: string | null;
  device_type: string | null;
  brand: string | null;
  model: string | null;
  assigned_to_name: string | null;
}

interface UseServiceRequestsReturn {
  requests: ServiceRequest[];
  filtered: ServiceRequest[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (s: string) => void;
  activeFilter: ServiceRequestActiveFilter;
  setActiveFilter: (f: ServiceRequestActiveFilter) => void;
  counts: {
    all: number;
    open: number;
    critical: number;
    sweep: number;
    maintenance: number;
  };
  refetch: () => void;
}

export function useServiceRequests(): UseServiceRequestsReturn {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ServiceRequestActiveFilter>("all");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await operationsDb
      .from("v_service_requests_with_context")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (err) {
      setError(err.message);
      setRequests([]);
    } else {
      setRequests((data ?? []) as ServiceRequest[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const counts = useMemo(() => {
    const open = requests.filter((r) =>
      ["new", "qualified", "scheduled", "in_progress"].includes(r.status),
    ).length;
    return {
      all: requests.length,
      open,
      critical: requests.filter((r) => r.priority === "critical").length,
      sweep: requests.filter((r) => r.request_category === "sweep").length,
      maintenance: requests.filter((r) => r.request_category === "annual_service")
        .length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    switch (activeFilter) {
      case "open":
        list = list.filter((r) =>
          ["new", "qualified", "scheduled", "in_progress"].includes(r.status),
        );
        break;
      case "critical":
        list = list.filter((r) => r.priority === "critical");
        break;
      case "sweep":
        list = list.filter((r) => r.request_category === "sweep");
        break;
      case "maintenance":
        list = list.filter((r) => r.request_category === "annual_service");
        break;
    }
    if (debouncedSearch) {
      list = list.filter(
        (r) =>
          (r.customer_name ?? "").toLowerCase().includes(debouncedSearch) ||
          (r.notes ?? "").toLowerCase().includes(debouncedSearch),
      );
    }
    return list;
  }, [requests, activeFilter, debouncedSearch]);

  return {
    requests,
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
