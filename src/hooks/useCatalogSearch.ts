import { useState, useEffect, useRef } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";

export interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  unit_price_ht: number;
  vat_rate: number;
  unit: string;
  product_type: string;
  description: string | null;
}

export function useCatalogSearch(term: string) {
  const [results, setResults] = useState<CatalogItem[]>([]);
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
        const { data } = await catalogDb
          .from("catalog_items")
          .select("id, name, sku, unit_price_ht, vat_rate, unit, product_type, description")
          .ilike("name", `%${term}%`)
          .eq("is_active", true)
          .limit(8);
        setResults((data as CatalogItem[]) || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [term]);

  return { results, loading };
}

/** Returns suggested VAT rate based on product_type */
export function suggestedVat(productType: string): number {
  return productType === "appliance" ? 5.5 : 10;
}
