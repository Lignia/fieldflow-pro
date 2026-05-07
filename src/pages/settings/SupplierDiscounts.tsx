import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Percent, Building2, Copy, Info } from "lucide-react";
import { toast } from "sonner";

interface SupplierDiscount {
  id: string;
  tenant_id: string;
  supplier_name: string;
  distributor_name: string | null;
  family_label: string | null;
  bareme_code: string | null;
  discount_pct: number;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
}

interface GridLine {
  id?: string;
  bareme_code: string;
  family_label: string;
  discount_pct: string;
  line_notes: string;
}

interface GridState {
  distributor_name: string;
  supplier_name: string;
  tarif_name: string;
  valid_from: string;
  valid_until: string;
  lines: GridLine[];
}

const TARIF_PREFIX = "[TARIF] ";
const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyLine = (): GridLine => ({
  bareme_code: "",
  family_label: "",
  discount_pct: "",
  line_notes: "",
});

const emptyGrid = (): GridState => ({
  distributor_name: "",
  supplier_name: "",
  tarif_name: "",
  valid_from: todayISO(),
  valid_until: "",
  lines: [emptyLine()],
});

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}

function isActive(valid_from: string | null, valid_until: string | null) {
  const today = todayISO();
  if (valid_from && valid_from > today) return false;
  if (valid_until && valid_until < today) return false;
  return true;
}

// Encode/decode tarif name in notes column (no schema change allowed)
function buildNotes(tarif_name: string, line_notes: string) {
  const t = tarif_name.trim();
  const n = line_notes.trim();
  const head = t ? `${TARIF_PREFIX}${t}` : "";
  if (head && n) return `${head}\n${n}`;
  return head || n || null as any;
}
function parseNotes(notes: string | null): { tarif_name: string; line_notes: string } {
  if (!notes) return { tarif_name: "", line_notes: "" };
  const lines = notes.split(/\r?\n/);
  if (lines[0]?.startsWith(TARIF_PREFIX)) {
    return {
      tarif_name: lines[0].slice(TARIF_PREFIX.length).trim(),
      line_notes: lines.slice(1).join("\n").trim(),
    };
  }
  return { tarif_name: "", line_notes: notes };
}

interface Grid {
  key: string;
  distributor_name: string;
  supplier_name: string;
  tarif_name: string;
  valid_from: string | null;
  valid_until: string | null;
  rows: SupplierDiscount[];
}

function groupGrids(rows: SupplierDiscount[]): Grid[] {
  const map = new Map<string, Grid>();
  for (const r of rows) {
    const { tarif_name } = parseNotes(r.notes);
    const distributor = r.distributor_name ?? r.supplier_name ?? "";
    const supplier = r.supplier_name ?? "";
    const key = [distributor, supplier, tarif_name, r.valid_from ?? "", r.valid_until ?? ""].join("§");
    if (!map.has(key)) {
      map.set(key, {
        key,
        distributor_name: distributor,
        supplier_name: supplier,
        tarif_name,
        valid_from: r.valid_from,
        valid_until: r.valid_until,
        rows: [],
      });
    }
    map.get(key)!.rows.push(r);
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.distributor_name || "").localeCompare(b.distributor_name || "")
  );
}

export default function SupplierDiscounts() {
  const { tenantId, loading: userLoading } = useCurrentUser();
  const [rows, setRows] = useState<SupplierDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridState>(emptyGrid());
  const [saving, setSaving] = useState(false);
  const [toDeleteGrid, setToDeleteGrid] = useState<Grid | null>(null);

  const grids = useMemo(() => groupGrids(rows), [rows]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await catalogDb
      .from("tenant_supplier_discounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("distributor_name", { ascending: true });
    if (error) {
      toast.error("Impossible de charger les conditions d'achat");
    } else {
      setRows((data ?? []) as SupplierDiscount[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const openCreate = () => {
    setEditingKey(null);
    setGrid(emptyGrid());
    setOpen(true);
  };

  const openEditGrid = (g: Grid) => {
    setEditingKey(g.key);
    setGrid({
      distributor_name: g.distributor_name,
      supplier_name: g.supplier_name,
      tarif_name: g.tarif_name,
      valid_from: g.valid_from ?? todayISO(),
      valid_until: g.valid_until ?? "",
      lines: g.rows.map((r) => ({
        id: r.id,
        bareme_code: r.bareme_code ?? "",
        family_label: r.family_label ?? "",
        discount_pct: r.discount_pct != null ? String(r.discount_pct) : "",
        line_notes: parseNotes(r.notes).line_notes,
      })),
    });
    setOpen(true);
  };

  const updateLine = (idx: number, patch: Partial<GridLine>) => {
    setGrid((g) => ({
      ...g,
      lines: g.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  };
  const addLine = () => setGrid((g) => ({ ...g, lines: [...g.lines, emptyLine()] }));
  const dupLine = (idx: number) =>
    setGrid((g) => ({
      ...g,
      lines: [
        ...g.lines.slice(0, idx + 1),
        { ...g.lines[idx], id: undefined },
        ...g.lines.slice(idx + 1),
      ],
    }));
  const delLine = (idx: number) =>
    setGrid((g) => ({
      ...g,
      lines: g.lines.length === 1 ? [emptyLine()] : g.lines.filter((_, i) => i !== idx),
    }));

  const headerValid =
    grid.distributor_name.trim().length > 0 && grid.valid_from.length > 0;

  const validLines = grid.lines.filter((l) => {
    const n = parseFloat(l.discount_pct.replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= 100;
  });
  const allLinesValid =
    grid.lines.length > 0 &&
    grid.lines.every((l) => {
      const n = parseFloat(l.discount_pct.replace(",", "."));
      return Number.isFinite(n) && n >= 0 && n <= 100;
    });

  const formValid = headerValid && allLinesValid && validLines.length > 0;

  const handleSave = async () => {
    if (!tenantId) {
      toast.error("Session non résolue, réessayez");
      return;
    }
    if (!formValid) return;
    setSaving(true);

    const distributor = grid.distributor_name.trim();
    const supplier = grid.supplier_name.trim() || distributor;

    const payload = grid.lines.map((l) => ({
      tenant_id: tenantId,
      distributor_name: distributor,
      supplier_name: supplier,
      family_label: l.family_label.trim() || null,
      bareme_code: l.bareme_code.trim() || null,
      discount_pct: parseFloat(l.discount_pct.replace(",", ".")),
      valid_from: grid.valid_from || null,
      valid_until: grid.valid_until || null,
      notes: buildNotes(grid.tarif_name, l.line_notes),
    }));

    // Delete existing grid rows (if editing) then insert fresh.
    if (editingKey) {
      const existing = grids.find((g) => g.key === editingKey);
      const ids = existing?.rows.map((r) => r.id) ?? [];
      if (ids.length > 0) {
        const { error: delErr } = await catalogDb
          .from("tenant_supplier_discounts")
          .delete()
          .in("id", ids)
          .eq("tenant_id", tenantId);
        if (delErr) {
          setSaving(false);
          toast.error("Modification impossible", { description: delErr.message });
          return;
        }
      }
    }

    const { error } = await catalogDb
      .from("tenant_supplier_discounts")
      .insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
      return;
    }
    toast.success(editingKey ? "Grille mise à jour" : "Grille enregistrée");
    setOpen(false);
    setEditingKey(null);
    setGrid(emptyGrid());
    loadData();
  };

  const handleDeleteGrid = async () => {
    if (!toDeleteGrid || !tenantId) return;
    const ids = toDeleteGrid.rows.map((r) => r.id);
    const { error } = await catalogDb
      .from("tenant_supplier_discounts")
      .delete()
      .in("id", ids)
      .eq("tenant_id", tenantId);
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
    } else {
      toast.success("Grille supprimée");
      loadData();
    }
    setToDeleteGrid(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Paramètres · Catalogue
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mes conditions d'achat
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saisissez vos remises négociées par fournisseur d'achat, fabricant et
            barème. Le catalogue produit reste maintenu par LIGNIA.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!tenantId} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle grille
        </Button>
      </header>

      {loading || userLoading ? (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : grids.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucune grille de remises enregistrée.
          </p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Créer votre première grille
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {grids.map((g) => {
            const active = isActive(g.valid_from, g.valid_until);
            return (
              <div key={g.key} className="rounded-lg border bg-card overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-4 border-b bg-muted/30">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{g.distributor_name || "—"}</span>
                      {g.supplier_name && g.supplier_name !== g.distributor_name && (
                        <>
                          <span className="text-muted-foreground text-sm">·</span>
                          <span className="text-sm">
                            Fabricant <span className="font-medium">{g.supplier_name}</span>
                          </span>
                        </>
                      )}
                      {!active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    {g.tarif_name && (
                      <p className="text-xs text-muted-foreground">
                        Tarif : <span className="font-medium text-foreground">{g.tarif_name}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Validité : {formatDate(g.valid_from)} → {formatDate(g.valid_until)}
                      {" · "}
                      {g.rows.length} ligne{g.rows.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEditGrid(g)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setToDeleteGrid(g)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Code barème</TableHead>
                      <TableHead>Famille produit</TableHead>
                      <TableHead className="text-right w-[100px]">Remise</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.map((r) => {
                      const { line_notes } = parseNotes(r.notes);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">
                            {r.bareme_code || (
                              <span className="text-muted-foreground italic">global</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{r.family_label || "—"}</TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(r.discount_pct).toLocaleString("fr-FR", {
                              maximumFractionDigits: 2,
                            })}
                            &nbsp;%
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={line_notes}>
                            {line_notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? "Modifier la grille de remises" : "Nouvelle grille de remises"}
            </DialogTitle>
            <DialogDescription>
              Saisissez l'en-tête de votre grille puis ajoutez une ligne par remise.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="distributor_name">
                  Fournisseur d'achat <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="distributor_name"
                  placeholder="Ex : Lorflex, Cedeo, Joncoux direct…"
                  value={grid.distributor_name}
                  onChange={(e) => setGrid((g) => ({ ...g, distributor_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Là où vous passez la commande.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplier_name">Fabricant / marque concernée</Label>
                <Input
                  id="supplier_name"
                  placeholder="Ex : Joncoux, Poujoulat, Kemp…"
                  value={grid.supplier_name}
                  onChange={(e) => setGrid((g) => ({ ...g, supplier_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide si la grille couvre toute la gamme du fournisseur.
                </p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="tarif_name">Nom du tarif / catalogue</Label>
                <Input
                  id="tarif_name"
                  placeholder="Ex : Tarif Lorflex Avril 2025"
                  value={grid.tarif_name}
                  onChange={(e) => setGrid((g) => ({ ...g, tarif_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_from">
                  Date de début <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={grid.valid_from}
                  onChange={(e) => setGrid((g) => ({ ...g, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_until">Date de fin</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={grid.valid_until}
                  onChange={(e) => setGrid((g) => ({ ...g, valid_until: e.target.value }))}
                />
              </div>
            </div>

            {/* Help banner */}
            <div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Sans <span className="font-medium text-foreground">code barème</span>, la
                remise s'applique globalement au fournisseur / fabricant. Avec un code
                barème, elle s'appliquera uniquement aux articles du catalogue LIGNIA
                portant ce même code.
              </p>
            </div>

            {/* Lines table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Code barème</TableHead>
                    <TableHead>Famille produit</TableHead>
                    <TableHead className="w-[120px]">Remise %</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[90px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grid.lines.map((l, idx) => {
                    const n = parseFloat(l.discount_pct.replace(",", "."));
                    const invalid =
                      l.discount_pct.length > 0 &&
                      (!Number.isFinite(n) || n < 0 || n > 100);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="p-2">
                          <Input
                            className="h-8 font-mono text-xs"
                            placeholder="ex : B12"
                            value={l.bareme_code}
                            onChange={(e) => updateLine(idx, { bareme_code: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className="h-8 text-sm"
                            placeholder="ex : Conduits inox"
                            value={l.family_label}
                            onChange={(e) => updateLine(idx, { family_label: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className={`h-8 font-mono text-sm ${invalid ? "border-destructive" : ""}`}
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            inputMode="decimal"
                            placeholder="0"
                            value={l.discount_pct}
                            onChange={(e) => updateLine(idx, { discount_pct: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className="h-8 text-sm"
                            placeholder="—"
                            value={l.line_notes}
                            onChange={(e) => updateLine(idx, { line_notes: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => dupLine(idx)}
                              title="Dupliquer"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => delLine(idx)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="border-t p-2">
                <Button size="sm" variant="ghost" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter une ligne
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!formValid || saving || !tenantId}>
              {saving ? "Enregistrement…" : editingKey ? "Enregistrer la grille" : "Créer la grille"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDeleteGrid} onOpenChange={(o) => !o && setToDeleteGrid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette grille ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDeleteGrid && (
                <>
                  Grille <strong>{toDeleteGrid.distributor_name}</strong>
                  {toDeleteGrid.tarif_name ? ` · ${toDeleteGrid.tarif_name}` : ""} —{" "}
                  {toDeleteGrid.rows.length} ligne
                  {toDeleteGrid.rows.length > 1 ? "s" : ""} seront supprimées.
                  Action irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGrid}
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
