import { useState, useEffect } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { getMockPropertiesForCustomer } from "@/mocks/data";

export interface Property {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  property_type: "house" | "apartment" | "commercial" | "other";
}

export function useCustomerProperties(customerId: string | null) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProperties = async () => {
    if (!customerId) { setProperties([]); return; }

    setLoading(true);

    if (import.meta.env.VITE_DEV_BYPASS_AUTH === "true") {
      setProperties(getMockPropertiesForCustomer(customerId) as Property[]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (coreDb as any)
        .from("properties")
        .select("id, address_line1, address_line2, city, postal_code, property_type")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties((data as Property[]) ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, [customerId]);

  return { properties, loading, refetch: fetchProperties };
}
