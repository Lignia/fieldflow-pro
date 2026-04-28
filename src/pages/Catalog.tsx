import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalog, Catalog as CatalogType, CatalogItem, NewItem } from "@/hooks/useCatalog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
import {
  Plus, Search, Pencil, Trash2, Package, BookOpen, FolderOpen, Upload,
  MoreVertical, Factory, Wrench, Boxes, Layers, Flame,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

/**
 * Mapping produit → libellé + couleur sémantique.
 * Les classes restent neutres (tokens du design system).
 */
const PRODUCT_TYPE_META: Record<
  string,
  { label: string; emoji: string; className: string }
> = {
  appliance: { label: "Appareil", emoji: "🔥", className: "bg-info/15 text-info border-info/30" },
  part: { label: "Pièce", emoji: "🏗️", className: "bg-muted text-foreground border-border" },
  service: { label: "Prestation", emoji: "🔧", className: "bg-success/15 text-success border-success/30" },
  consumable: { label: "Consommable", emoji: "📦", className: "bg-warning/15 text-warning border-warning/30" },
};

/**
 * Type métier dérivé du nom + catalog_type.
 * La base ne stocke que internal/supplier — on regroupe visuellement.
 */
type CatalogKind = "internal" | "supplier" | "bundle" | "consumable";

function getCatalogKind(cat: CatalogType): CatalogKind {
  const n = (cat.name || "").toLowerCase();
  if (cat.catalog_type === "supplier") return "supplier";
  if (n.includes("ouvrage") || n.includes("pack") || n.includes("lot")) return "bundle";
  if (n.includes("consommable") || n.includes("petit matériel")) return "consumable";
  return "internal";
}

const KIND_META: Record<
  CatalogKind,
  {
    label: string;
    badgeClass: string;
    sectionTitle: string;
    sectionIcon: typeof Package;
    emptyHint: string;
  }
> = {
  internal: {
    label: "Interne",
    badgeClass: "bg-muted text-muted-foreground border-border",
    sectionTitle: "Catalogue interne",
    sectionIcon: Package,
    emptyHint: "Vos produits, prestations et tarifs maison.",
  },
  supplier: {
    label: "Fournisseur",
    badgeClass: "bg-info/15 text-info border-info/30",
    sectionTitle: "Catalogues fournisseurs",
    sectionIcon: Factory,
    emptyHint: "Importez vos tarifs Joncoux, Poujoulat, Tubest…",
  },
  bundle: {
    label: "Ouvrage",
    badgeClass: "bg-success/15 text-success border-success/30",
    sectionTitle: "Ouvrages (lots pré-chiffrés)",
    sectionIcon: Layers,
    emptyHint: "Regroupez vos prestations récurrentes en un seul lot.",
  },
  consumable: {
    label: "Consommables",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
    sectionTitle: "Consommables",
    sectionIcon: Wrench,
    emptyHint: "Visserie, joints, petits éléments récurrents.",
  },
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
    hasMore, loadingMore, loadMoreItems,
    createCatalog, createItem, updateItem, toggleItem, deleteItem,
    renameCatalog, deleteCatalog,
  } = useCatalog();

  const { tenantId, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [renamingCatalog, setRenamingCatalog] = useState<CatalogType | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [catalogToDelete, setCatalogToDelete] = useState<CatalogType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);

  // Catalogues groupés par type métier
  const groupedCatalogs = useMemo(() => {
    const groups: Record<CatalogKind, CatalogType[]> = {
      internal: [], supplier: [], bundle: [], consumable: [],
    };
    for (const c of catalogs) groups[getCatalogKind(c)].push(c);
    return groups;
  }, [catalogs]);

  const selectedKind: CatalogKind | null = selectedCatalog
    ? getCatalogKind(selectedCatalog)
    : null;

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        (i.sku && i.sku.toLowerCase().includes(lower)) ||
        (i.description && i.description.toLowerCase().includes(lower)) ||
        ((i as any).supplier_ref && String((i as any).supplier_ref).toLowerCase().includes(lower))
    );
  }, [items, search]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || search) return; // pause infinite scroll on local filter
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreItems();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMoreItems, search, items.length]);

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
      toast.success(active ? "Produit activé" : "Produit désactivé");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem(itemToDelete.id);
      toast.success("Produit supprimé");
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleRenameCatalog = async () => {
    if (!renamingCatalog || !renameValue.trim()) return;
    try {
      await renameCatalog(renamingCatalog.id, renameValue.trim());
      toast.success("Catalogue renommé");
      setRenamingCatalog(null);
      setRenameValue("");
    } catch {
      toast.error("Renommage impossible");
    }
  };

  const handleDeleteCatalog = async () => {
    if (!catalogToDelete) return;
    try {
      await deleteCatalog(catalogToDelete.id);
      toast.success("Catalogue supprimé");
    } catch {
      toast.error("Suppression impossible (catalogue non vide ou protégé)");
    } finally {
      setCatalogToDelete(null);
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

  // CTA contextuel selon le type de catalogue
  const renderPrimaryCta = (kind: CatalogKind) => {
    if (isGlobalCatalog) return null;
    if (kind === "supplier") {
      return (
        <Button size="sm" variant="outline" onClick={() => navigate("/catalog/import")}>
          <Upload className="h-4 w-4 mr-1" />
          {filteredItems.length > 0 ? "Mettre à jour le tarif" : "Importer des articles"}
        </Button>
      );
    }
    const labels: Record<Exclude<CatalogKind, "supplier">, string> = {
      internal: "Ajouter un produit",
      bundle: "Créer un ouvrage",
      consumable: "Ajouter un consommable",
    };
    return (
      <Button size="sm" onClick={handleAddItem}>
        <Plus className="h-4 w-4 mr-1" /> {labels[kind]}
      </Button>
    );
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

  const totalCatalogs = catalogs.length;
  const totalItemsAcrossCatalogs = catalogs.reduce(
    (acc, c) => acc + (c.items_count ?? 0),
    0,
  );
  const headerSubtitle =
    totalCatalogs === 0
      ? "Aucun catalogue"
      : totalItemsAcrossCatalogs === 0
      ? `${totalCatalogs} catalogue${totalCatalogs > 1 ? "s" : ""} · aucun article importé`
      : `${totalCatalogs} catalogue${totalCatalogs > 1 ? "s" : ""} · ${totalItemsAcrossCatalogs.toLocaleString("fr-FR")} article${totalItemsAcrossCatalogs > 1 ? "s" : ""}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">{headerSubtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/catalog/import")}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Importer un catalogue
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column — Catalogs */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mes catalogues</h2>
            <Button size="sm" variant="outline" onClick={() => setCatalogModalOpen(true)} disabled={userLoading || !tenantId}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau
            </Button>
          </div>

          {catalogs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun catalogue</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setCatalogModalOpen(true)} disabled={userLoading || !tenantId}>
                  Créer un catalogue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {(["internal", "supplier", "bundle", "consumable"] as CatalogKind[]).map((kind) => {
                const list = groupedCatalogs[kind];
                if (list.length === 0) return null;
                const meta = KIND_META[kind];
                const SectionIcon = meta.sectionIcon;
                return (
                  <div key={kind} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <SectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {meta.sectionTitle}
                      </h3>
                    </div>
                    {list.map((cat) => {
                      const isSelected = selectedCatalogId === cat.id;
                      const isReadOnly = cat.tenant_id === null;
                      return (
                        <div
                          key={cat.id}
                          className={`group relative rounded-lg border transition-colors ${
                            isSelected
                              ? "border-accent bg-accent/10 shadow-sm"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          <button
                            onClick={() => setSelectedCatalogId(cat.id)}
                            className="w-full text-left px-3 py-2.5 pr-9"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-foreground truncate">
                                {cat.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 shrink-0 ${meta.badgeClass}`}
                              >
                                {meta.label}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {(cat.items_count ?? 0).toLocaleString("fr-FR")} article
                              {(cat.items_count ?? 0) > 1 ? "s" : ""}
                            </span>
                            {isReadOnly && (
                              <span className="text-[11px] text-muted-foreground block">
                                Catalogue global · lecture seule
                              </span>
                            )}
                          </button>
                          {!isReadOnly && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-1 top-1.5 h-7 w-7 opacity-60 hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRenamingCatalog(cat);
                                    setRenameValue(cat.name);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setCatalogToDelete(cat)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — Items */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedCatalog || !selectedKind ? (
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
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{selectedCatalog.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${KIND_META[selectedKind].badgeClass}`}
                      >
                        {KIND_META[selectedKind].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedKind === "supplier"
                        ? `${filteredItems.length} article${filteredItems.length !== 1 ? "s" : ""}`
                        : `${filteredItems.length} produit${filteredItems.length !== 1 ? "s" : ""}`}
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
                    {filteredItems.length > 0 && renderPrimaryCta(selectedKind)}
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
                    <Flame className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    {search ? (
                      <p className="text-sm text-muted-foreground">Aucun résultat</p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {selectedKind === "supplier" ? "Aucun article importé" : "Aucun produit dans ce catalogue"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {KIND_META[selectedKind].emptyHint}
                        </p>
                        <div className="mt-3">{renderPrimaryCta(selectedKind)}</div>
                      </>
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
                          <TableHead className="text-right hidden lg:table-cell">Coût HT</TableHead>
                          <TableHead className="text-right">Prix HT</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">TVA</TableHead>
                          <TableHead className="hidden sm:table-cell">Unité</TableHead>
                          {!isGlobalCatalog && (
                            <>
                              <TableHead className="text-center">Actif</TableHead>
                              <TableHead className="w-20" />
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const typeMeta =
                            PRODUCT_TYPE_META[item.product_type] ?? {
                              label: item.product_type,
                              emoji: "•",
                              className: "bg-muted text-foreground border-border",
                            };
                          return (
                            <TableRow
                              key={item.id}
                              className={`group ${item.is_active ? "" : "opacity-60"}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{item.name}</span>
                                  {!item.is_active && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border"
                                    >
                                      Inactif
                                    </Badge>
                                  )}
                                </div>
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
                                <Badge variant="outline" className={`text-[10px] ${typeMeta.className}`}>
                                  <span className="mr-1">{typeMeta.emoji}</span>
                                  {typeMeta.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                                {item.cost_price != null && item.cost_price > 0
                                  ? formatCurrency(item.cost_price)
                                  : <span className="text-muted-foreground/40">—</span>}
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
                                    <div className="flex items-center justify-end gap-0.5">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleEdit(item)}
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Modifier</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-60 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                            onClick={() => setItemToDelete(item)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Supprimer</TooltipContent>
                                      </Tooltip>
                                    </div>
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
                {!itemsLoading && filteredItems.length > 0 && (
                  <div ref={sentinelRef} className="py-4 text-center text-xs text-muted-foreground">
                    {loadingMore
                      ? "Chargement…"
                      : hasMore && !search
                        ? "Faites défiler pour charger plus"
                        : `${items.length} article${items.length > 1 ? "s" : ""} chargé${items.length > 1 ? "s" : ""}`}
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

      {/* Renommer un catalogue */}
      <AlertDialog open={!!renamingCatalog} onOpenChange={(o) => !o && setRenamingCatalog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renommer le catalogue</AlertDialogTitle>
            <AlertDialogDescription>
              Choisissez un nouveau nom pour ce catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nom du catalogue"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameCatalog} disabled={!renameValue.trim()}>
              Renommer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supprimer un catalogue */}
      <AlertDialog open={!!catalogToDelete} onOpenChange={(o) => !o && setCatalogToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce catalogue ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{catalogToDelete?.name}</strong> et tous ses articles seront définitivement supprimés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCatalog}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supprimer un produit */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => !o && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{itemToDelete?.name}</strong> sera définitivement supprimé du catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
