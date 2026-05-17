import { useState, useEffect, useRef } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface CatalogSearchResult {
  id: string;
  name: string;
  normalized_name: string | null;
  sku: string | null;
  sku_code: string | null;
  supplier_ref: string | null;
  supplier_name: string | null;
  supplier_range: string | null;
  product_kind: string | null;
  product_type: string;
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
  // ── Champs v2 (search_quote_items_v2) ──────────────────────────
  needs_human_review: boolean;
  pricing_status: string | null;
  prix_sur_devis: boolean;
  is_etanche: boolean | null;
  has_dta: boolean;
  dta_status: string | null;
  energy_type_simple: string | null;
  is_central: boolean;
  source_system: string | null;
}

// Compat: QuoteEditor importe encore CatalogItem
export type CatalogItem = CatalogSearchResult & {
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
        // STABILISATION-1 : migration v1 → v2
        const { data, error } = await catalogDb.rpc("search_quote_items_v2", {
          p_tenant_id: tenantId,
          p_query: term.trim(),
          p_active_supplier_names: activeSuppliers,
          p_quote_context: "fumisterie",
          p_include_low_priority: includeLowPriority,
          p_limit: 12,
        });

        if (error) throw error;

        const items = ((data as CatalogSearchResult[]) ?? []).map((r) => ({
          ...r,
          product_type: r.product_type ?? "part",
          sku_code: r.sku_code ?? null,
          description: null,
          brand: r.supplier_name ?? null,
          is_labor: r.product_kind === "labor",
          // Valeurs par défaut pour les champs v2 si absents (protection)
          needs_human_review: r.needs_human_review ?? false,
          pricing_status: r.pricing_status ?? null,
          prix_sur_devis: r.prix_sur_devis ?? false,
          is_etanche: r.is_etanche ?? null,
          has_dta: r.has_dta ?? false,
          dta_status: r.dta_status ?? null,
          energy_type_simple: r.energy_type_simple ?? null,
          is_central: r.is_central ?? false,
          source_system: r.source_system ?? null,
        })) as CatalogItem[];

        setResults(items);
      } catch (rpcError) {
        // Fallback FTS + ilike si la RPC échoue — EXPLICITE (non silencieux)
        console.warn(
          "[useCatalogSearch] search_quote_items_v2 RPC failed, falling back to direct catalog_items query.",
          rpcError,
        );
        try {
          const cols =
            "id, name, sku, sku_code, unit_price_ht, vat_rate, unit, " +
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
            (((data ?? []) as CatalogSearchResult[]).map((r) => ({
              ...r,
              sku_code: r.sku_code ?? null,
              search_score: 50,
              boost_score: 0,
              default_visible: true,
              // Champs v2 absents du fallback — valeurs neutres
              needs_human_review: false,
              pricing_status: null,
              prix_sur_devis: false,
              is_etanche: null,
              has_dta: false,
              dta_status: null,
              energy_type_simple: null,
              is_central: false,
              source_system: null,
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
