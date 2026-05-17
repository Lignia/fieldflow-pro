import { useState, useEffect, useRef } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

// Tous les champs retournés par catalog.search_quote_items_v2
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
  // ── Champs v2 ────────────────────────────────────────────────
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
        const { data, error } = await catalogDb.rpc("search_quote_items_v2", {
          p_tenant_id: tenantId,
          p_query: term.trim(),
          p_active_supplier_names: activeSuppliers,
          p_quote_context: "fumisterie",
          p_include_low_priority: includeLowPriority,
          p_limit: 12,
        });

        // Échec RPC → fail hard : pas de fallback silencieux vers catalog_items
        if (error) {
          console.error("[useCatalogSearch] search_quote_items_v2 failed:", error);
          toast.error("Erreur de recherche catalogue. Réessayez.");
          setResults([]);
          return;
        }

        const rows = (data as CatalogSearchResult[]) ?? [];
        setResults(
          rows.map((r) => ({
            ...r,
            product_type: r.product_type ?? "part",
            description: null,
            brand: r.supplier_name ?? null,
            is_labor: r.product_kind === "labor",
          })) as CatalogItem[],
        );
      } catch (err) {
        console.error("[useCatalogSearch] unexpected error:", err);
        toast.error("Erreur inattendue lors de la recherche catalogue.");
        setResults([]);
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

/** Taux TVA suggéré selon product_type. Utilisé en fallback si vat_rate absent du catalogue. */
export function suggestedVat(productType: string): number {
  return productType === "appliance" ? 5.5 : 10;
}
