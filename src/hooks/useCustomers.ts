import { useState, useEffect, useCallback } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { supabase } from "@/integrations/supabase/client";

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

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "mock-1",
    customer_type: "particulier",
    name: "M. Jean Morel",
    email: "jean.morel@email.fr",
    phone: "06 12 34 56 78",
    siret: null,
    status: "prospect",
    source_origin: "web",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-2",
    customer_type: "professionnel",
    name: "Durand & Fils SARL",
    email: "contact@durand-fils.fr",
    phone: "04 56 78 90 12",
    siret: "12345678901234",
    status: "active",
    source_origin: "referral",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "mock-3",
    customer_type: "particulier",
    name: "Mme Sophie Martin",
    email: "sophie.martin@gmail.com",
    phone: "07 98 76 54 32",
    siret: null,
    status: "active",
    source_origin: "phone",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "mock-4",
    customer_type: "collectivite",
    name: "Mairie de Chambéry",
    email: "technique@chambery.fr",
    phone: "04 79 00 00 00",
    siret: "21730065100014",
    status: "active",
    source_origin: "manual",
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "mock-5",
    customer_type: "particulier",
    name: "M. Pierre Fabre",
    email: null,
    phone: "06 11 22 33 44",
    siret: null,
    status: "prospect",
    source_origin: "showroom",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>(DEV_BYPASS ? MOCK_CUSTOMERS : []);
  const [loading, setLoading] = useState(!DEV_BYPASS);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (DEV_BYPASS) return;
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
    if (DEV_BYPASS) {
      // Filter mock data locally
      if (search.trim()) {
      const q = search.trim().toLowerCase();
        setCustomers(MOCK_CUSTOMERS.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q))
        ));
      } else {
        setCustomers(MOCK_CUSTOMERS);
      }
      return;
    }

    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [search, fetchCustomers]);

  const createCustomer = useCallback(
    async (input: CreateCustomerInput): Promise<{ success: boolean; error?: string }> => {
      if (DEV_BYPASS) {
        const newCustomer: Customer = {
          id: `mock-${Date.now()}`,
          customer_type: input.customer_type,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          siret: input.siret ?? null,
          status: "prospect",
          source_origin: "manual",
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
        };
        setCustomers((prev) => [newCustomer, ...prev]);
        return { success: true };
      }

      setCreating(true);
      try {
        const { error: insertError } = await coreDb.from("customers").insert({
          name: input.name,
          customer_type: input.customer_type,
          email: input.email || null,
          phone: input.phone || null,
          siret: input.siret || null,
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
