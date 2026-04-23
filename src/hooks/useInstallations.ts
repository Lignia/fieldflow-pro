import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

export type InstallationStatus = "draft" | "planned" | "installed" | "commissioned" | "active";
export type DeviceCategory = "stove" | "insert" | "fireplace" | "boiler" | "other";
export type FuelType = "wood" | "pellet" | "gas" | "oil" | "mixed" | "other";

export interface Installation {
  id: string;
  status: InstallationStatus;
  device_type: string | null;
  device_category: DeviceCategory | null;
  fuel_type: FuelType | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  commissioning_date: string | null;
  manufacturer_warranty_end: string | null;
  service_warranty_end: string | null;
  last_sweep_date: string | null;
  next_sweep_date: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  has_maintenance_contract: boolean | null;
  installed_by_self: boolean | null;
  takeover_date: string | null;
  customer_id: string | null;
  property_id: string | null;
  project_id: string | null;
  customer_name: string | null;
  address_line1: string | null;
  city: string | null;
}

interface UseInstallationsReturn {
  installations: Installation[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  refetch: () => void;
}

export function useInstallations(): UseInstallationsReturn {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchInstallations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = coreDb
        .from("v_installations_with_customer")
        .select(
          "id, status, device_type, device_category, fuel_type, brand, model, serial_number, commissioning_date, manufacturer_warranty_end, service_warranty_end, last_sweep_date, next_sweep_date, last_service_date, next_service_date, has_maintenance_contract, installed_by_self, takeover_date, customer_id, property_id, project_id, customer_name, address_line1, city"
        )
        .order("next_sweep_date", { ascending: true, nullsFirst: false })
        .limit(200);

      if (search.trim()) {
        const term = search.trim();
        query = query.or(`customer_name.ilike.%${term}%,device_type.ilike.%${term}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setInstallations((data as Installation[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchInstallations, 300);
    return () => clearTimeout(debounce);
  }, [search, fetchInstallations]);

  return { installations, loading, error, search, setSearch, refetch: fetchInstallations };
}