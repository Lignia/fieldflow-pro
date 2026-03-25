import { useState, useEffect, useCallback } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

export interface Catalog {
  id: string;
  name: string;
  catalog_type: string;
  is_active: boolean;
  tenant_id: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit_price_ht: number;
  vat_rate: number;
  unit: string;
  product_type: string;
  is_active: boolean;
  catalog: { id: string; name: string } | null;
}

export interface NewItem {
  name: string;
  sku?: string;
  description?: string;
  unit_price_ht: number;
  vat_rate: number;
  unit: string;
  product_type: string;
}

const MOCK_CATALOG: Catalog = {
  id: "cat-mock-1",
  name: "Mon catalogue",
  catalog_type: "internal",
  is_active: true,
  tenant_id: "tenant-mock",
};

const MOCK_ITEMS: CatalogItem[] = [
  { id: "ci-1", name: "Poêle Invicta Onsen 8kW", sku: "INV-ONS-8", description: "Poêle à bois 8kW rendement 80%", unit_price_ht: 2890, vat_rate: 5.5, unit: "u", product_type: "appliance", is_active: true, catalog: { id: "cat-mock-1", name: "Mon catalogue" } },
  { id: "ci-2", name: "Kit raccordement inox Ø150", sku: "RAC-INX-150", description: "Kit complet raccordement fumisterie", unit_price_ht: 485, vat_rate: 10, unit: "u", product_type: "part", is_active: true, catalog: { id: "cat-mock-1", name: "Mon catalogue" } },
  { id: "ci-3", name: "Plaque de sol verre trempé", sku: "PLS-VER-100", description: "Plaque de protection 100x80cm", unit_price_ht: 189, vat_rate: 10, unit: "u", product_type: "part", is_active: true, catalog: { id: "cat-mock-1", name: "Mon catalogue" } },
  { id: "ci-4", name: "Main d'œuvre pose + MES", sku: "MO-POSE-STD", description: "Pose et mise en service", unit_price_ht: 78, vat_rate: 10, unit: "h", product_type: "service", is_active: true, catalog: { id: "cat-mock-1", name: "Mon catalogue" } },
];

export function useCatalog() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalogs
  const fetchCatalogs = useCallback(async () => {
    if (DEV_BYPASS) {
      setCatalogs([MOCK_CATALOG]);
      setSelectedCatalogId(MOCK_CATALOG.id);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await catalogDb
        .from("catalogs")
        .select("id, name, catalog_type, is_active, tenant_id")
        .order("created_at", { ascending: true });
      if (err) throw err;
      setCatalogs((data as Catalog[]) || []);
      if (data && data.length > 0 && !selectedCatalogId) {
        setSelectedCatalogId(data[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [selectedCatalogId]);

  // Fetch items for selected catalog
  const fetchItems = useCallback(async (catalogId: string) => {
    if (DEV_BYPASS) {
      setItems(MOCK_ITEMS.filter((i) => i.catalog?.id === catalogId));
      return;
    }
    setItemsLoading(true);
    try {
      const { data, error: err } = await catalogDb
        .from("catalog_items")
        .select(`
          id, name, sku, description,
          unit_price_ht, vat_rate,
          unit, product_type, is_active,
          catalog:catalog_id (id, name)
        `)
        .eq("catalog_id", catalogId)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (err) throw err;
      setItems((data as CatalogItem[]) || []);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement des produits");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  useEffect(() => {
    if (selectedCatalogId) fetchItems(selectedCatalogId);
  }, [selectedCatalogId, fetchItems]);

  const createCatalog = async (name: string, catalogType: string) => {
    if (DEV_BYPASS) {
      const newCat: Catalog = { id: `cat-${Date.now()}`, name, catalog_type: catalogType, is_active: true, tenant_id: "tenant-mock" };
      setCatalogs((prev) => [...prev, newCat]);
      return newCat;
    }
    const { data, error: err } = await catalogDb
      .from("catalogs")
      .insert({ name, catalog_type: catalogType, is_active: true })
      .select("id, name, catalog_type, is_active, tenant_id")
      .single();
    if (err) throw err;
    setCatalogs((prev) => [...prev, data as Catalog]);
    return data as Catalog;
  };

  const createItem = async (catalogId: string, item: NewItem) => {
    if (DEV_BYPASS) {
      const newItem: CatalogItem = {
        id: `ci-${Date.now()}`,
        ...item,
        sku: item.sku || null,
        description: item.description || null,
        is_active: true,
        catalog: catalogs.find((c) => c.id === catalogId)
          ? { id: catalogId, name: catalogs.find((c) => c.id === catalogId)!.name }
          : null,
      };
      setItems((prev) => [...prev, newItem]);
      return newItem;
    }
    const { data, error: err } = await catalogDb
      .from("catalog_items")
      .insert({
        catalog_id: catalogId,
        name: item.name,
        sku: item.sku || null,
        description: item.description || null,
        unit_price_ht: item.unit_price_ht,
        vat_rate: item.vat_rate,
        unit: item.unit,
        product_type: item.product_type,
        is_active: true,
      })
      .select(`
        id, name, sku, description,
        unit_price_ht, vat_rate,
        unit, product_type, is_active,
        catalog:catalog_id (id, name)
      `)
      .single();
    if (err) throw err;
    setItems((prev) => [...prev, data as CatalogItem]);
    return data as CatalogItem;
  };

  const updateItem = async (itemId: string, changes: Partial<NewItem>) => {
    if (DEV_BYPASS) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...changes } as CatalogItem : i)));
      return;
    }
    const { error: err } = await catalogDb
      .from("catalog_items")
      .update(changes)
      .eq("id", itemId);
    if (err) throw err;
    if (selectedCatalogId) fetchItems(selectedCatalogId);
  };

  const toggleItem = async (itemId: string, isActive: boolean) => {
    if (DEV_BYPASS) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_active: isActive } : i)));
      return;
    }
    const { error: err } = await catalogDb
      .from("catalog_items")
      .update({ is_active: isActive })
      .eq("id", itemId);
    if (err) throw err;
    if (selectedCatalogId) fetchItems(selectedCatalogId);
  };

  const selectedCatalog = catalogs.find((c) => c.id === selectedCatalogId) || null;
  const isGlobalCatalog = selectedCatalog?.tenant_id === null;

  return {
    catalogs,
    items,
    selectedCatalogId,
    selectedCatalog,
    isGlobalCatalog,
    setSelectedCatalogId,
    loading,
    itemsLoading,
    error,
    createCatalog,
    createItem,
    updateItem,
    toggleItem,
    refetch: fetchCatalogs,
  };
}
