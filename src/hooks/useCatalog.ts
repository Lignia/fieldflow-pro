import { useState, useEffect, useCallback } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  cost_price: number | null;
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
  cost_price?: number | null;
  vat_rate: number;
  unit: string;
  product_type: string;
}

export function useCatalog() {
  const { tenantId } = useCurrentUser();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogs = useCallback(async () => {
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

  const fetchItems = useCallback(async (catalogId: string) => {
    setItemsLoading(true);
    try {
      const { data, error: err } = await catalogDb
        .from("catalog_items")
        .select(`
          id, name, sku, description,
          unit_price_ht, cost_price, vat_rate,
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
    const { data, error: err } = await catalogDb
      .from("catalogs")
      .insert({ tenant_id: tenantId, name, catalog_type: catalogType, is_active: true })
      .select("id, name, catalog_type, is_active, tenant_id")
      .single();
    if (err) throw err;
    setCatalogs((prev) => [...prev, data as Catalog]);
    return data as Catalog;
  };

  const createItem = async (catalogId: string, item: NewItem) => {
    const { data, error: err } = await catalogDb
      .from("catalog_items")
      .insert({
        tenant_id: tenantId,
        catalog_id: catalogId,
        name: item.name,
        sku: item.sku || null,
        description: item.description || null,
        unit_price_ht: item.unit_price_ht,
        cost_price: item.cost_price ?? null,
        vat_rate: item.vat_rate,
        unit: item.unit,
        product_type: item.product_type,
        is_active: true,
      })
      .select(`
        id, name, sku, description,
        unit_price_ht, cost_price, vat_rate,
        unit, product_type, is_active,
        catalog:catalog_id (id, name)
      `)
      .single();
    if (err) throw err;
    setItems((prev) => [...prev, data as CatalogItem]);
    return data as CatalogItem;
  };

  const updateItem = async (itemId: string, changes: Partial<NewItem>) => {
    const { error: err } = await catalogDb
      .from("catalog_items")
      .update(changes)
      .eq("id", itemId);
    if (err) throw err;
    if (selectedCatalogId) fetchItems(selectedCatalogId);
  };

  const toggleItem = async (itemId: string, isActive: boolean) => {
    const { error: err } = await catalogDb
      .from("catalog_items")
      .update({ is_active: isActive })
      .eq("id", itemId);
    if (err) throw err;
    if (selectedCatalogId) fetchItems(selectedCatalogId);
  };

  const deleteItem = async (itemId: string) => {
    const { error: err } = await catalogDb
      .from("catalog_items")
      .delete()
      .eq("id", itemId);
    if (err) throw err;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const renameCatalog = async (catalogId: string, newName: string) => {
    const { error: err } = await catalogDb
      .from("catalogs")
      .update({ name: newName })
      .eq("id", catalogId);
    if (err) throw err;
    setCatalogs((prev) =>
      prev.map((c) => (c.id === catalogId ? { ...c, name: newName } : c)),
    );
  };

  const deleteCatalog = async (catalogId: string) => {
    const { error: err } = await catalogDb
      .from("catalogs")
      .delete()
      .eq("id", catalogId);
    if (err) throw err;
    setCatalogs((prev) => prev.filter((c) => c.id !== catalogId));
    if (selectedCatalogId === catalogId) {
      setSelectedCatalogId(null);
    }
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
    deleteItem,
    renameCatalog,
    deleteCatalog,
    refetch: fetchCatalogs,
  };
}
