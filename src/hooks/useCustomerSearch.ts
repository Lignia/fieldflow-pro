import { useState, useEffect, useRef } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

export interface CustomerSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customer_type: "particulier" | "professionnel" | "collectivite";
}

const MOCK_CUSTOMERS: CustomerSearchResult[] = [
  { id: "mock-c1", name: "M. Morel", email: "morel@email.fr", phone: "06 12 34 56 78", customer_type: "particulier" },
  { id: "mock-c2", name: "Mme Durand", email: "durand@email.fr", phone: "06 98 76 54 32", customer_type: "particulier" },
  { id: "mock-c3", name: "SCI Les Alpes", email: "contact@sci-alpes.fr", phone: "04 79 00 11 22", customer_type: "professionnel" },
];

export function useCustomerSearch(term: string) {
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);

      if (import.meta.env.VITE_DEV_BYPASS_AUTH === "true") {
        const q = term.toLowerCase();
        setResults(MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)));
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (coreDb as any)
          .from("customers")
          .select("id, name, email, phone, customer_type")
          .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
          .in("status", ["active", "prospect"])
          .limit(8);

        if (error) throw error;
        setResults((data as CustomerSearchResult[]) ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [term]);

  return { results, loading };
}
