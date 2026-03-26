import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";
import {
  MOCK_CUSTOMERS,
  findMockCustomer,
  getMockPropertiesForCustomer,
  getMockProjectsForCustomer,
  getMockInstallationsForCustomer,
} from "@/mocks/data";

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

function getMockReturn(customerId: string): UseClientDetailReturn {
  const c = findMockCustomer(customerId) ?? MOCK_CUSTOMERS[0];
  const cid = c.id;
  return {
    customer: { ...c, payload: c.payload ?? {} } as ClientDetail,
    properties: getMockPropertiesForCustomer(cid) as ClientProperty[],
    projects: getMockProjectsForCustomer(cid).map((p) => ({
      id: p.id,
      project_number: p.project_number,
      status: p.status,
      created_at: p.created_at,
      modified_at: p.modified_at,
    })),
    installations: getMockInstallationsForCustomer(cid) as ClientInstallation[],
    loading: false,
    error: null,
    refetch: () => {},
  };
}

export function useClientDetail(customerId: string | undefined): UseClientDetailReturn {
  const isMock = DEV_BYPASS || (customerId?.startsWith("mock-") ?? false);

  const mockReturn = isMock && customerId ? getMockReturn(customerId) : null;

  const [customer, setCustomer] = useState<ClientDetail | null>(mockReturn?.customer ?? null);
  const [properties, setProperties] = useState<ClientProperty[]>(mockReturn?.properties ?? []);
  const [projects, setProjects] = useState<ClientProject[]>(mockReturn?.projects ?? []);
  const [installations, setInstallations] = useState<ClientInstallation[]>(mockReturn?.installations ?? []);
  const [loading, setLoading] = useState(!isMock);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (isMock || !customerId) return;
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
  }, [customerId, isMock]);

  useEffect(() => {
    if (isMock && customerId) {
      const m = getMockReturn(customerId);
      setCustomer(m.customer);
      setProperties(m.properties);
      setProjects(m.projects);
      setInstallations(m.installations);
      setLoading(false);
      return;
    }
    fetchAll();
  }, [fetchAll, isMock, customerId]);

  return { customer, properties, projects, installations, loading, error, refetch: fetchAll };
}
