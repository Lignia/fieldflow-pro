import { useState, useMemo } from "react";
import { useCatalog, CatalogItem, NewItem } from "@/hooks/useCatalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ItemFormModal } from "@/components/catalog/ItemFormModal";
import { CatalogFormModal } from "@/components/catalog/CatalogFormModal";
import { Plus, Search, Pencil, Package, BookOpen, FolderOpen } from "lucide-react";
import { toast } from "sonner";

const TYPE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  appliance: { label: "Appareil", variant: "default" },
  part: { label: "Pièce", variant: "secondary" },
  service: { label: "Appareil", variant: "outline" },
  consumable: { label: "Consommable", variant: "destructive" },
};

const CATALOG_TYPE_LABELS: Record<string, string> = {
  internal: "Interne",
  supplier: "Fournisseur",
};

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString("fr-FR") + " €";
}

function formatVat(rate: number): string {
  return rate % 1 === 0 ? `${rate} %` : `${rate.toFixed(1).replace(".", ",")} %`;
}

export default function Catalog() {
  const {
    catalogs, items, selectedCatalogId, selectedCatalog, isGlobalCatalog,
    setSelectedCatalogId, loading, itemsLoading,
    createCatalog, createItem, updateItem, toggleItem,
  } = useCatalog();

  const [search, setSearch] = useState("");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        (i.sku && i.sku.toLowerCase().includes(lower))
    );
  }, [items, search]);

  const handleSaveCatalog = async (name: string, catalogType: string) => {
    try {
      const cat = await createCatalog(name, catalogType);
      setSelectedCatalogId(cat.id);
      toast.success("Catalogue créé");
    } catch {
      toast.error("Erreur lors de la création du catalogue");
    }
  };

  const handleSaveItem = async (item: NewItem) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, item);
        toast.success("Produit mis à jour");
      } else if (selectedCatalogId) {
        await createItem(selectedCatalogId, item);
        toast.success("Produit ajouté au catalogue");
      }
      setEditingItem(null);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleToggle = async (itemId: string, active: boolean) => {
    try {
      await toggleItem(itemId, active);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {catalogs.length} catalogue{catalogs.length !== 1 ? "s" : ""} · {items.length} produit{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column — Catalogs */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mes catalogues</h2>
            <Button size="sm" variant="outline" onClick={() => setCatalogModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau
            </Button>
          </div>

          {catalogs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun catalogue</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setCatalogModalOpen(true)}>
                  Créer un catalogue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {catalogs.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatalogId(cat.id)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    selectedCatalogId === cat.id
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{cat.name}</span>
                    <Badge variant={cat.catalog_type === "internal" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {CATALOG_TYPE_LABELS[cat.catalog_type] || cat.catalog_type}
                    </Badge>
                  </div>
                  {cat.tenant_id === null && (
                    <span className="text-[11px] text-muted-foreground">Catalogue global · lecture seule</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column — Items */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedCatalog ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Sélectionnez un catalogue pour voir ses produits</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{selectedCatalog.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {filteredItems.length} produit{filteredItems.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-48"
                      />
                    </div>
                    {!isGlobalCatalog && (
                      <Button size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4 mr-1" /> Ajouter
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {itemsLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "Aucun produit trouvé" : "Aucun produit dans ce catalogue"}
                    </p>
                    {!search && !isGlobalCatalog && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={handleAddItem}>
                        Ajouter un produit
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Désignation</TableHead>
                          <TableHead className="hidden md:table-cell">Réf.</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Prix HT</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">TVA</TableHead>
                          <TableHead className="hidden sm:table-cell">Unité</TableHead>
                          {!isGlobalCatalog && (
                            <>
                              <TableHead className="text-center">Actif</TableHead>
                              <TableHead className="w-10" />
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const typeBadge = TYPE_BADGES[item.product_type] || { label: item.product_type, variant: "secondary" as const };
                          return (
                            <TableRow key={item.id} className="group">
                              <TableCell>
                                <span className="font-medium text-foreground">{item.name}</span>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {item.sku ? (
                                  <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={typeBadge.variant}
                                  className={`text-[10px] ${
                                    item.product_type === "appliance"
                                      ? "bg-info/15 text-info border-info/30"
                                      : item.product_type === "service"
                                      ? "bg-success/15 text-success border-success/30"
                                      : item.product_type === "consumable"
                                      ? "bg-warning/15 text-warning border-warning/30"
                                      : ""
                                  }`}
                                >
                                  {item.product_type === "appliance" ? "Appareil" : item.product_type === "part" ? "Pièce" : item.product_type === "service" ? "Prestation" : "Consommable"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatCurrency(item.unit_price_ht)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                                {formatVat(item.vat_rate)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{item.unit}</TableCell>
                              {!isGlobalCatalog && (
                                <>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={item.is_active}
                                      onCheckedChange={(checked) => handleToggle(item.id, checked)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => handleEdit(item)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Modifier</TooltipContent>
                                    </Tooltip>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <CatalogFormModal open={catalogModalOpen} onOpenChange={setCatalogModalOpen} onSave={handleSaveCatalog} />
      <ItemFormModal
        open={itemModalOpen}
        onOpenChange={(open) => { setItemModalOpen(open); if (!open) setEditingItem(null); }}
        onSave={handleSaveItem}
        editItem={editingItem}
      />
    </div>
  );
}
