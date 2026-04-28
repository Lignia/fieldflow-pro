import { useState, useEffect, useCallback } from "react";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface Catalog {
  id: string;
  name: string;
  catalog_type: string;
  is_active: boolean;
  tenant_id: string | null;
  items_count?: number;
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
  // Supplier source fields (immutable when supplier_name is set)
  supplier_ref?: string | null;
  supplier_name?: string | null;
  brand?: string | null;
  // LIGNIA normalization layer
  product_kind?: string | null;
  normalized_name?: string | null;
  diameter_inner_mm?: number | null;
  diameter_outer_mm?: number | null;
  length_mm?: number | null;
  angle_deg?: number | null;
  normalization_status?: string | null;
  normalization_confidence?: number | null;
  catalog?: { id: string; name: string } | null;
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

const ITEM_COLUMNS = `
  id, name, sku, description,
  unit_price_ht, cost_price, vat_rate,
  unit, product_type, is_active,
  supplier_ref, supplier_name, brand,
  product_kind, normalized_name,
  diameter_inner_mm, diameter_outer_mm, length_mm, angle_deg,
  normalization_status, normalization_confidence
`;

const PAGE_SIZE = 50;

export function useCatalog() {
  const { tenantId } = useCurrentUser();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await catalogDb
        .from("catalogs")
        .select("id, name, catalog_type, is_active, tenant_id, catalog_items(count)")
        .order("created_at", { ascending: true });
      if (err) throw err;
      const normalized: Catalog[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        catalog_type: c.catalog_type,
        is_active: c.is_active,
        tenant_id: c.tenant_id,
        items_count: Array.isArray(c.catalog_items) && c.catalog_items[0]
          ? Number(c.catalog_items[0].count) || 0
          : 0,
      }));
      setCatalogs(normalized);
      if (normalized.length > 0 && !selectedCatalogId) {
        // Auto-sélection : le catalogue le plus rempli, sinon le premier
        const richest = [...normalized].sort(
          (a, b) => (b.items_count ?? 0) - (a.items_count ?? 0),
        )[0];
        setSelectedCatalogId(richest.id);
      }
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [selectedCatalogId]);

  const fetchItemsPage = useCallback(
    async (catalogId: string, from: number) => {
      const { data, error: err } = await catalogDb
        .from("catalog_items")
        .select(ITEM_COLUMNS)
        .eq("catalog_id", catalogId)
        .order("is_active", { ascending: false })
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (err) throw err;
      const rows = (data as CatalogItem[]) || [];
      return { rows, hasMore: rows.length === PAGE_SIZE };
    },
    [],
  );

  const fetchItems = useCallback(
    async (catalogId: string) => {
      setItemsLoading(true);
      try {
        const { rows, hasMore: more } = await fetchItemsPage(catalogId, 0);
        setItems(rows);
        setHasMore(more);
      } catch (e: any) {
        setError(e.message || "Erreur de chargement des produits");
      } finally {
        setItemsLoading(false);
      }
    },
    [fetchItemsPage],
  );

  const loadMoreItems = useCallback(async () => {
    if (!selectedCatalogId || !hasMore || loadingMore || itemsLoading) return;
    setLoadingMore(true);
    try {
      const { rows, hasMore: more } = await fetchItemsPage(
        selectedCatalogId,
        items.length,
      );
      setItems((prev) => [...prev, ...rows]);
      setHasMore(more);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoadingMore(false);
    }
  }, [selectedCatalogId, hasMore, loadingMore, itemsLoading, items.length, fetchItemsPage]);

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
      .select(ITEM_COLUMNS)
      .single();
    if (err) throw err;
    setItems((prev) => [...prev, data as CatalogItem]);
    return data as CatalogItem;
  };

  const updateItem = async (
    itemId: string,
    changes: Partial<NewItem> & { customer_label?: string | null },
  ) => {
    // Protection : sur les articles fournisseurs, les champs source sont
    // immuables — seules les surcouches LIGNIA sont éditables.
    const current = items.find((i) => i.id === itemId);
    const isSupplierItem = !!current?.supplier_name;

    let safeChanges: Record<string, any> = { ...changes };
    if (isSupplierItem) {
      const FORBIDDEN = ["name", "sku", "supplier_ref", "cost_price"];
      for (const f of FORBIDDEN) delete safeChanges[f];
      if (Object.keys(safeChanges).length === 0) {
        throw new Error(
          "Champs verrouillés : article fournisseur. Utilise customer_label pour personnaliser le libellé client.",
        );
      }
    }

    const { error: err } = await catalogDb
      .from("catalog_items")
      .update(safeChanges)
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
    const { error: err } = await catalogDb.rpc("delete_catalog_with_items", {
      p_catalog_id: catalogId,
    });
    if (err) throw err;

    const remaining = catalogs.filter((c) => c.id !== catalogId);
    setCatalogs(remaining);

    if (selectedCatalogId === catalogId) {
      const next = remaining.length > 0
        ? [...remaining].sort(
            (a, b) => (b.items_count ?? 0) - (a.items_count ?? 0),
          )[0]
        : null;
      setSelectedCatalogId(next ? next.id : null);
      if (!next) setItems([]);
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
    loadingMore,
    hasMore,
    loadMoreItems,
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
