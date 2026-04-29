import { useState, useEffect, useRef } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface CatalogSearchResult {
  id: string;
  name: string;
  normalized_name: string | null;
  sku: string | null;
  supplier_ref: string | null;
  supplier_name: string | null;
  supplier_range: string | null;
  product_kind: string | null;
  technology_type: string | null;
  diameter_inner_mm: number | null;
  diameter_outer_mm: number | null;
  length_mm: number | null;
  angle_deg: number | null;
  finish_color: string | null;
  unit_price_ht: number;
  cost_price: number | null;
  vat_rate: number;
  unit: string;
  normalization_status: string | null;
  search_score: number;
  boost_score: number;
  default_visible: boolean;
}

// Compat: QuoteEditor importe encore CatalogItem
export type CatalogItem = CatalogSearchResult & {
  product_type: string;
  description: string | null;
  brand: string | null;
  is_labor: boolean | null;
};

export function useCatalogSearch(
  term: string,
  activeSuppliers: string[] | null = null,
  includeLowPriority = false,
) {
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const { tenantId } = useCurrentUser();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!term || term.trim().length < 2) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await catalogDb.rpc("search_quote_items", {
          p_tenant_id: tenantId,
          p_query: term.trim(),
          p_active_supplier_names: activeSuppliers,
          p_quote_context: "fumisterie",
          p_include_low_priority: includeLowPriority,
          p_limit: 12,
        });

        if (error) throw error;

        const items = ((data as any[]) ?? []).map((r) => ({
          ...r,
          product_type: r.product_type ?? "part",
          description: null,
          brand: r.supplier_name ?? null,
          is_labor: r.product_kind === "labor",
        })) as CatalogItem[];

        setResults(items);
      } catch {
        // Fallback FTS + ilike si la RPC échoue
        try {
          const cols =
            "id, name, sku, unit_price_ht, vat_rate, unit, " +
            "product_type, description, supplier_ref, supplier_name, " +
            "brand, cost_price, is_labor, normalized_name, product_kind";
          const escaped = term.trim().replace(/[%_]/g, " ");
          const { data } = await catalogDb
            .from("catalog_items")
            .select(cols)
            .eq("is_active", true)
            .or(
              `name.ilike.%${escaped}%,sku.ilike.%${escaped}%,` +
                `supplier_ref.ilike.%${escaped}%,` +
                `search_keywords.ilike.%${escaped}%,` +
                `normalized_name.ilike.%${escaped}%`,
            )
            .limit(12);

          setResults(
            (((data ?? []) as any[]).map((r) => ({
              ...r,
              search_score: 50,
              boost_score: 0,
              default_visible: true,
            })) as CatalogItem[]),
          );
        } catch {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [term, activeSuppliers, includeLowPriority, tenantId]);

  return { results, loading };
}

/** Returns suggested VAT rate based on product_type */
export function suggestedVat(productType: string): number {
  return productType === "appliance" ? 5.5 : 10;
}
