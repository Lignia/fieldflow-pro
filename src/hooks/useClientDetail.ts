import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

export interface ClientDetail {
  id: string;
  customer_type: "particulier" | "professionnel" | "collectivite";
  name: string;
  email: string | null;
  phone: string | null;
  siret: string | null;
  status: string;
  source_origin: string;
  created_at: string;
  modified_at: string;
  payload: Record<string, unknown> | null;
}

export interface ClientProperty {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  property_type: string | null;
  created_at: string;
}

export interface ClientProject {
  id: string;
  project_number: string;
  status: string;
  created_at: string;
  modified_at: string;
}

export interface ClientInstallation {
  id: string;
  appliance_label: string;
  installation_status: string;
  next_sweep_date: string | null;
  created_at: string;
}

interface UseClientDetailReturn {
  customer: ClientDetail | null;
  properties: ClientProperty[];
  projects: ClientProject[];
  installations: ClientInstallation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_CUSTOMER: ClientDetail = {
  id: "mock-1",
  customer_type: "particulier",
  name: "M. Jean Morel",
  email: "jean.morel@email.fr",
  phone: "06 12 34 56 78",
  siret: null,
  status: "active",
  source_origin: "phone",
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  modified_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  payload: {},
};

const MOCK_PROPERTIES: ClientProperty[] = [
  {
    id: "prop-1",
    address_line1: "12 rue des Alpes",
    address_line2: null,
    city: "Chambéry",
    postal_code: "73000",
    property_type: "house",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "prop-2",
    address_line1: "45 avenue du Mont-Blanc",
    address_line2: "Bât. C",
    city: "Annecy",
    postal_code: "74000",
    property_type: "apartment",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

const MOCK_PROJECTS: ClientProject[] = [
  {
    id: "proj-1",
    project_number: "PRJ-2026-0012",
    status: "vt_planned",
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "proj-2",
    project_number: "PRJ-2026-0008",
    status: "signed",
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const MOCK_INSTALLATIONS: ClientInstallation[] = [
  {
    id: "inst-1",
    appliance_label: "Poêle Jøtul F520",
    installation_status: "active",
    next_sweep_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
  {
    id: "inst-2",
    appliance_label: "Insert Stûv 16",
    installation_status: "commissioned",
    next_sweep_date: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

export function useClientDetail(customerId: string | undefined): UseClientDetailReturn {
  const [customer, setCustomer] = useState<ClientDetail | null>(DEV_BYPASS ? MOCK_CUSTOMER : null);
  const [properties, setProperties] = useState<ClientProperty[]>(DEV_BYPASS ? MOCK_PROPERTIES : []);
  const [projects, setProjects] = useState<ClientProject[]>(DEV_BYPASS ? MOCK_PROJECTS : []);
  const [installations, setInstallations] = useState<ClientInstallation[]>(DEV_BYPASS ? MOCK_INSTALLATIONS : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (DEV_BYPASS || !customerId) return;
    setLoading(true);
    setError(null);

    try {
      const [customerRes, propsRes, projRes, instRes] = await Promise.all([
        coreDb
          .from("customers")
          .select("id, customer_type, name, email, phone, siret, status, source_origin, created_at, modified_at, payload")
          .eq("id", customerId)
          .maybeSingle(),
        coreDb
          .from("properties")
          .select("id, address_line1, address_line2, city, postal_code, property_type, created_at")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
        coreDb
          .from("projects")
          .select("id, project_number, status, created_at, modified_at")
          .eq("customer_id", customerId)
          .order("modified_at", { ascending: false })
          .limit(10),
        coreDb
          .from("installations")
          .select("id, appliance_label, installation_status, next_sweep_date, created_at")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      ]);

      if (customerRes.error) { setError(customerRes.error.message); return; }
      if (!customerRes.data) { setError("Client introuvable"); return; }

      setCustomer(customerRes.data as ClientDetail);
      setProperties((propsRes.data as ClientProperty[]) ?? []);
      setProjects((projRes.data as ClientProject[]) ?? []);
      setInstallations((instRes.data as ClientInstallation[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { customer, properties, projects, installations, loading, error, refetch: fetchAll };
}
