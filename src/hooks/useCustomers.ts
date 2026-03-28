import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface Customer {
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
}

export interface CreateCustomerInput {
  name: string;
  customer_type: "particulier" | "professionnel" | "collectivite";
  email?: string;
  phone?: string;
  siret?: string;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  refetch: () => void;
  createCustomer: (input: CreateCustomerInput) => Promise<{ success: boolean; error?: string }>;
  creating: boolean;
}

export function useCustomers(): UseCustomersReturn {
  const { tenantId } = useCurrentUser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = coreDb
        .from("customers")
        .select("id, customer_type, name, email, phone, siret, status, source_origin, created_at, modified_at")
        .order("modified_at", { ascending: false })
        .limit(200);

      if (search.trim()) {
        const term = search.trim();
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setCustomers((data as Customer[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [search, fetchCustomers]);

  const createCustomer = useCallback(
    async (input: CreateCustomerInput): Promise<{ success: boolean; error?: string }> => {
      setCreating(true);
      try {
        const { error: insertError } = await coreDb.from("customers").insert({
          tenant_id: tenantId,
          name: input.name,
          customer_type: input.customer_type,
          email: input.email || null,
          phone: input.phone || null,
          siret: input.siret || null,
          status: "prospect",
          source_origin: "manual",
          payload: {},
        });

        if (insertError) return { success: false, error: insertError.message };

        await fetchCustomers();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message ?? "Erreur inattendue" };
      } finally {
        setCreating(false);
      }
    },
    [fetchCustomers]
  );

  return { customers, loading, error, search, setSearch, refetch: fetchCustomers, createCustomer, creating };
}
