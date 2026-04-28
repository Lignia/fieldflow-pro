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
  // Snapshot source fields (immutable supplier data + normalization)
  supplier_ref?: string | null;
  supplier_name?: string | null;
  brand?: string | null;
  cost_price?: number | null;
  is_labor?: boolean | null;
  normalized_name?: string | null;
  product_kind?: string | null;
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
        const cols =
          "id, name, sku, unit_price_ht, vat_rate, unit, product_type, description, " +
          "supplier_ref, supplier_name, brand, cost_price, is_labor, " +
          "normalized_name, product_kind";

        // 1) Full-text search via search_vector (websearch syntax)
        const ftQuery = term
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => t.replace(/[:&|!()'"\\]/g, ""))
          .filter(Boolean)
          .join(" & ");

        let merged: CatalogItem[] = [];
        if (ftQuery) {
          const { data: ftData } = await catalogDb
            .from("catalog_items")
            .select(cols)
            .eq("is_active", true)
            .textSearch("search_vector", ftQuery, { config: "french" })
            .limit(12);
          if (ftData) merged = ftData as CatalogItem[];
        }

        // 2) Fallback ilike on multiple columns (covers SKUs, codes, refs, keywords)
        if (merged.length < 8) {
          const escaped = term.replace(/[%_,]/g, " ").trim();
          const pattern = `%${escaped}%`;
          const { data: ilikeData } = await catalogDb
            .from("catalog_items")
            .select(cols)
            .eq("is_active", true)
            .or(
              [
                `name.ilike.${pattern}`,
                `sku.ilike.${pattern}`,
                `supplier_ref.ilike.${pattern}`,
                `search_keywords.ilike.${pattern}`,
                `normalized_name.ilike.${pattern}`,
              ].join(",")
            )
            .limit(12);
          if (ilikeData) {
            const seen = new Set(merged.map((r) => r.id));
            for (const r of ilikeData as CatalogItem[]) {
              if (!seen.has(r.id)) {
                merged.push(r);
                seen.add(r.id);
              }
            }
          }
        }

        setResults(merged.slice(0, 12));
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
