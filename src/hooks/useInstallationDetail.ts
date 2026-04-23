import { useCallback, useEffect, useState } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

export interface InstallationDetail {
  id: string;
  status: string | null;
  installation_status?: string | null;
  device_type: string | null;
  device_category: string | null;
  fuel_type: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  barcode_id: string | null;
  memo: string | null;
  origin: string | null;
  installed_by_self: boolean | null;
  takeover_date: string | null;
  commissioning_date: string | null;
  last_sweep_date: string | null;
  next_sweep_date: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  manufacturer_warranty_start: string | null;
  manufacturer_warranty_end: string | null;
  service_warranty_start: string | null;
  service_warranty_end: string | null;
  has_maintenance_contract: boolean | null;
  maintenance_contract_start: string | null;
  maintenance_contract_end: string | null;
  customer_id: string | null;
  property_id: string | null;
  project_id: string | null;
  catalog_item_id: string | null;
  customer_name: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
}

export interface InstallationActivity {
  id: string;
  activity_type: string;
  payload: any;
  occurred_at: string;
  actor_user_id: string | null;
}

interface UseInstallationDetailReturn {
  installation: InstallationDetail | null;
  activities: InstallationActivity[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refetch: () => void;
}

export function useInstallationDetail(installationId: string | undefined): UseInstallationDetailReturn {
  const [installation, setInstallation] = useState<InstallationDetail | null>(null);
  const [activities, setActivities] = useState<InstallationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!installationId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [instRes, actRes] = await Promise.all([
        coreDb
          .from("v_installations_with_customer")
          .select("*")
          .eq("id", installationId)
          .maybeSingle(),
        coreDb
          .from("activities")
          .select("id, activity_type, payload, occurred_at, actor_user_id")
          .eq("scope_type", "installation")
          .eq("scope_id", installationId)
          .order("occurred_at", { ascending: false })
          .limit(20),
      ]);

      if (instRes.error) {
        setError(instRes.error.message);
        return;
      }

      if (!instRes.data) {
        setNotFound(true);
        return;
      }

      setInstallation(instRes.data as InstallationDetail);
      setActivities((actRes.data as InstallationActivity[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [installationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { installation, activities, loading, error, notFound, refetch: fetchAll };
}
