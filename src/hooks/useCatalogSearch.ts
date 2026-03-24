import { useState, useEffect, useRef } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

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

const MOCK_CATALOG: CatalogItem[] = [
  { id: "cat-1", name: "Poêle Invicta Onsen 8kW", sku: "INV-ONS-8", unit_price_ht: 2890, vat_rate: 5.5, unit: "u", product_type: "appliance", description: "Poêle à bois 8kW rendement 80%" },
  { id: "cat-2", name: "Kit raccordement inox Ø150", sku: "RAC-INX-150", unit_price_ht: 485, vat_rate: 10, unit: "u", product_type: "accessory", description: "Kit complet raccordement fumisterie" },
  { id: "cat-3", name: "Plaque de sol verre trempé", sku: "PLS-VER-100", unit_price_ht: 189, vat_rate: 10, unit: "u", product_type: "accessory", description: "Plaque de protection 100x80cm" },
  { id: "cat-4", name: "Main d'œuvre pose + MES", sku: "MO-POSE-STD", unit_price_ht: 78, vat_rate: 10, unit: "h", product_type: "labor", description: "Pose et mise en service" },
];

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

      if (DEV_BYPASS) {
        const lower = term.toLowerCase();
        setResults(MOCK_CATALOG.filter((c) => c.name.toLowerCase().includes(lower)));
        setLoading(false);
        return;
      }

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
