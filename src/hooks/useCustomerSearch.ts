import { useState, useEffect, useRef } from "react";
import { coreDb } from "@/integrations/supabase/schema-clients";

export interface CustomerSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customer_type: "particulier" | "professionnel" | "collectivite";
}

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
