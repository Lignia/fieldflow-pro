import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { catalogDb } from "@/integrations/supabase/schema-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Plus, Pencil, Trash2, Building2, Copy, Info, Percent, Grid3x3, ClipboardPaste,
} from "lucide-react";
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

type Mode = "global" | "grid";

interface GridState {
  mode: Mode;
  distributor_name: string;
  supplier_name: string;
  tarif_name: string;
  valid_from: string;
  valid_until: string;
  // global only
  global_discount_pct: string;
  global_notes: string;
  // grid only
  lines: GridLine[];
}

const TARIF_PREFIX = "[TARIF] ";
const GLOBAL_FAMILY = "Remise globale";
const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyLine = (): GridLine => ({
  bareme_code: "",
  family_label: "",
  discount_pct: "",
  line_notes: "",
});

const emptyGrid = (mode: Mode = "grid"): GridState => ({
  mode,
  distributor_name: "",
  supplier_name: "",
  tarif_name: "",
  valid_from: todayISO(),
  valid_until: "",
  global_discount_pct: "",
  global_notes: "",
  lines: [emptyLine()],
});

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}

type Status = "active" | "expired" | "upcoming";
function computeStatus(valid_from: string | null, valid_until: string | null): Status {
  const today = todayISO();
  if (valid_from && valid_from > today) return "upcoming";
  if (valid_until && valid_until < today) return "expired";
  return "active";
}
function StatusBadge({ status }: { status: Status }) {
  if (status === "active") return <Badge variant="success">Actif</Badge>;
  if (status === "expired") return <Badge variant="outline">Expiré</Badge>;
  return <Badge variant="info">À venir</Badge>;
}

function buildNotes(tarif_name: string, line_notes: string) {
  const t = tarif_name.trim();
  const n = line_notes.trim();
  const head = t ? `${TARIF_PREFIX}${t}` : "";
  if (head && n) return `${head}\n${n}`;
  return head || n || null;
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

// Group by distributor_name for the card-per-supplier display
interface DistributorGroup {
  distributor_name: string;
  grids: Grid[];
}
function groupByDistributor(grids: Grid[]): DistributorGroup[] {
  const map = new Map<string, DistributorGroup>();
  for (const g of grids) {
    const k = g.distributor_name || "—";
    if (!map.has(k)) map.set(k, { distributor_name: k, grids: [] });
    map.get(k)!.grids.push(g);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.distributor_name.localeCompare(b.distributor_name)
  );
}

// Paste parser: accepts tab, multi-space, pipe
interface ParsedPasteLine {
  bareme_code: string;
  family_label: string;
  discount_pct: string;
  valid: boolean;
  raw: string;
}
function parsePastedGrid(text: string): ParsedPasteLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((raw) => {
    let parts: string[];
    if (raw.includes("|")) parts = raw.split("|").map((s) => s.trim());
    else if (raw.includes("\t")) parts = raw.split("\t").map((s) => s.trim());
    else parts = raw.split(/ {2,}/).map((s) => s.trim());
    parts = parts.filter(Boolean);

    if (parts.length < 2) {
      return { bareme_code: "", family_label: raw, discount_pct: "", valid: false, raw };
    }
    // last part = discount, first = code, middle = family
    const last = parts[parts.length - 1].replace("%", "").replace(",", ".").trim();
    const n = parseFloat(last);
    const valid = Number.isFinite(n) && n >= 0 && n <= 100;
    const code = parts[0];
    const family = parts.slice(1, -1).join(" ").trim();
    return {
      bareme_code: code,
      family_label: family,
      discount_pct: valid ? String(n) : last,
      valid,
      raw,
    };
  });
}

export default function SupplierDiscounts() {
  const { tenantId, loading: userLoading } = useCurrentUser();
  const [rows, setRows] = useState<SupplierDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridState>(emptyGrid("grid"));
  const [saving, setSaving] = useState(false);
  const [toDeleteGrid, setToDeleteGrid] = useState<Grid | null>(null);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const grids = useMemo(() => groupGrids(rows), [rows]);
  const distributorGroups = useMemo(() => groupByDistributor(grids), [grids]);

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

  const openCreate = (mode: Mode) => {
    setEditingKey(null);
    setGrid(emptyGrid(mode));
    setOpen(true);
  };

  const openEditGrid = (g: Grid) => {
    setEditingKey(g.key);
    // Detect global mode: 1 row, no bareme_code, family = global
    const isGlobal =
      g.rows.length === 1 &&
      !g.rows[0].bareme_code &&
      (g.rows[0].family_label === GLOBAL_FAMILY || !g.rows[0].family_label);

    if (isGlobal) {
      const r = g.rows[0];
      const { line_notes } = parseNotes(r.notes);
      setGrid({
        mode: "global",
        distributor_name: g.distributor_name,
        supplier_name: g.supplier_name,
        tarif_name: g.tarif_name,
        valid_from: g.valid_from ?? todayISO(),
        valid_until: g.valid_until ?? "",
        global_discount_pct: String(r.discount_pct ?? ""),
        global_notes: line_notes,
        lines: [emptyLine()],
      });
    } else {
      setGrid({
        mode: "grid",
        distributor_name: g.distributor_name,
        supplier_name: g.supplier_name,
        tarif_name: g.tarif_name,
        valid_from: g.valid_from ?? todayISO(),
        valid_until: g.valid_until ?? "",
        global_discount_pct: "",
        global_notes: "",
        lines: g.rows.map((r) => ({
          id: r.id,
          bareme_code: r.bareme_code ?? "",
          family_label: r.family_label ?? "",
          discount_pct: r.discount_pct != null ? String(r.discount_pct) : "",
          line_notes: parseNotes(r.notes).line_notes,
        })),
      });
    }
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

  // Validation
  const headerValid =
    grid.distributor_name.trim().length > 0 && grid.valid_from.length > 0;

  let formValid = false;
  if (grid.mode === "global") {
    const n = parseFloat(grid.global_discount_pct.replace(",", "."));
    formValid =
      headerValid &&
      grid.supplier_name.trim().length > 0 &&
      Number.isFinite(n) && n >= 0 && n <= 100;
  } else {
    const allLinesValid =
      grid.lines.length > 0 &&
      grid.lines.every((l) => {
        const n = parseFloat(l.discount_pct.replace(",", "."));
        return Number.isFinite(n) && n >= 0 && n <= 100;
      });
    formValid = headerValid && grid.supplier_name.trim().length > 0 && allLinesValid;
  }

  const handleSave = async () => {
    if (!tenantId) {
      toast.error("Session non résolue, réessayez");
      return;
    }
    if (!formValid) return;
    setSaving(true);

    const distributor = grid.distributor_name.trim();
    const supplier = grid.supplier_name.trim() || distributor;

    let payload: any[];
    if (grid.mode === "global") {
      payload = [{
        tenant_id: tenantId,
        distributor_name: distributor,
        supplier_name: supplier,
        family_label: GLOBAL_FAMILY,
        bareme_code: null,
        discount_pct: parseFloat(grid.global_discount_pct.replace(",", ".")),
        valid_from: grid.valid_from || null,
        valid_until: grid.valid_until || null,
        notes: buildNotes(grid.tarif_name, grid.global_notes),
      }];
    } else {
      payload = grid.lines.map((l) => ({
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
    }

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
    toast.success(editingKey ? "Remises mises à jour" : "Remises enregistrées");
    setOpen(false);
    setEditingKey(null);
    setGrid(emptyGrid("grid"));
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
      toast.success("Remises supprimées");
      loadData();
    }
    setToDeleteGrid(null);
  };

  // Paste handlers
  const openPaste = () => {
    setPasteText("");
    setPasteOpen(true);
  };
  const applyPaste = () => {
    const parsed = parsePastedGrid(pasteText);
    if (parsed.length === 0) {
      toast.error("Aucune ligne détectée");
      return;
    }
    const newLines: GridLine[] = parsed.map((p) => ({
      bareme_code: p.bareme_code,
      family_label: p.family_label,
      discount_pct: p.discount_pct,
      line_notes: p.valid ? "" : "⚠ Ligne à vérifier",
    }));
    setGrid((g) => {
      // Replace empty starter line, otherwise append
      const baseLines = g.lines.length === 1 &&
        !g.lines[0].bareme_code && !g.lines[0].family_label && !g.lines[0].discount_pct
        ? []
        : g.lines;
      return { ...g, lines: [...baseLines, ...newLines] };
    });
    const invalidCount = parsed.filter((p) => !p.valid).length;
    if (invalidCount > 0) {
      toast.warning(`${parsed.length} lignes préremplies, ${invalidCount} à vérifier`);
    } else {
      toast.success(`${parsed.length} lignes préremplies`);
    }
    setPasteOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Paramètres · Catalogue
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Vos remises fournisseur
        </h1>
        <p className="text-sm text-muted-foreground">
          Indiquez les remises que votre fournisseur vous accorde. LIGNIA les
          utilisera pour calculer vos prix d'achat.
        </p>
      </header>

      {loading || userLoading ? (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : grids.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-medium">Aucune remise enregistrée</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Choisissez un mode de saisie pour commencer.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button onClick={() => openCreate("global")} disabled={!tenantId}>
                <Percent className="h-4 w-4 mr-1" />
                Remise globale
              </Button>
              <Button onClick={() => openCreate("grid")} disabled={!tenantId} variant="outline">
                <Grid3x3 className="h-4 w-4 mr-1" />
                Grille par familles / barèmes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => openCreate("global")} disabled={!tenantId} size="sm">
              <Percent className="h-4 w-4 mr-1" />
              Remise globale
            </Button>
            <Button onClick={() => openCreate("grid")} disabled={!tenantId} size="sm" variant="outline">
              <Grid3x3 className="h-4 w-4 mr-1" />
              Grille par familles / barèmes
            </Button>
          </div>

          <div className="space-y-4">
            {distributorGroups.map((dg) => (
              <Card key={dg.distributor_name}>
                <CardHeader className="py-4 border-b">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{dg.distributor_name}</span>
                      <span className="text-xs text-muted-foreground">
                        · {dg.grids.reduce((acc, g) => acc + g.rows.length, 0)} barème
                        {dg.grids.reduce((acc, g) => acc + g.rows.length, 0) > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {dg.grids.map((g) => {
                    const status = computeStatus(g.valid_from, g.valid_until);
                    const families = new Map<string, SupplierDiscount[]>();
                    for (const r of g.rows) {
                      const k = r.family_label || "—";
                      if (!families.has(k)) families.set(k, []);
                      families.get(k)!.push(r);
                    }
                    return (
                      <div key={g.key} className="border-b last:border-b-0">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 p-4 bg-muted/20">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {g.supplier_name && g.supplier_name !== g.distributor_name && (
                                <span className="text-sm">
                                  Fabricant <span className="font-medium">{g.supplier_name}</span>
                                </span>
                              )}
                              <StatusBadge status={status} />
                            </div>
                            {g.tarif_name && (
                              <p className="text-xs text-muted-foreground">
                                Tarif : <span className="font-medium text-foreground">{g.tarif_name}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Validité : {formatDate(g.valid_from)} → {formatDate(g.valid_until)}
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
                        {Array.from(families.entries()).map(([family, items]) => (
                          <div key={family} className="px-4 py-3 border-t">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                              {family}
                            </p>
                            <div className="space-y-1">
                              {items.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 text-sm">
                                  {r.bareme_code ? (
                                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">
                                      {r.bareme_code}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic shrink-0 w-[60px]">
                                      global
                                    </span>
                                  )}
                                  <span className="font-mono text-sm font-medium text-foreground">
                                    -{Number(r.discount_pct).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}%
                                  </span>
                                  {parseNotes(r.notes).line_notes && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      · {parseNotes(r.notes).line_notes}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKey
                ? "Modifier les remises"
                : grid.mode === "global"
                ? "Nouvelle remise globale"
                : "Nouvelle grille de remises"}
            </DialogTitle>
            <DialogDescription>
              {grid.mode === "global"
                ? "Une seule remise s'applique à tous les produits du fabricant."
                : "Une remise par famille ou code barème."}
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
                <Label htmlFor="supplier_name">
                  Fabricant / marque <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supplier_name"
                  placeholder="Ex : Joncoux, Poujoulat, Kemp…"
                  value={grid.supplier_name}
                  onChange={(e) => setGrid((g) => ({ ...g, supplier_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  La marque concernée par la remise.
                </p>
              </div>
              {grid.mode === "grid" && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tarif_name">Nom du tarif</Label>
                  <Input
                    id="tarif_name"
                    placeholder="Ex : Tarif Lorflex Avril 2025"
                    value={grid.tarif_name}
                    onChange={(e) => setGrid((g) => ({ ...g, tarif_name: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="valid_from">
                  Valide depuis <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={grid.valid_from}
                  onChange={(e) => setGrid((g) => ({ ...g, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_until">Valide jusqu'au</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={grid.valid_until}
                  onChange={(e) => setGrid((g) => ({ ...g, valid_until: e.target.value }))}
                />
              </div>
            </div>

            {grid.mode === "global" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="global_pct">
                      Remise % <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="global_pct"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      inputMode="decimal"
                      placeholder="Ex : 15"
                      value={grid.global_discount_pct}
                      onChange={(e) => setGrid((g) => ({ ...g, global_discount_pct: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="global_notes">Notes</Label>
                    <Input
                      id="global_notes"
                      placeholder="Optionnel"
                      value={grid.global_notes}
                      onChange={(e) => setGrid((g) => ({ ...g, global_notes: e.target.value }))}
                    />
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Exemple : Lorflex vous accorde 15 % sur tous les produits Joncoux.
                    Cette remise s'appliquera à toute la gamme du fabricant.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Lignes de la grille</p>
                  <Button size="sm" variant="outline" onClick={openPaste}>
                    <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                    Coller une grille
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Le code barème doit correspondre exactement aux codes barèmes
                    présents dans le catalogue LIGNIA pour que le prix net soit
                    calculé automatiquement. Sans code barème, la remise s'applique
                    à toute la famille.
                  </AlertDescription>
                </Alert>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Code barème</TableHead>
                        <TableHead>Famille produit</TableHead>
                        <TableHead className="w-[110px]">Remise %</TableHead>
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
                                placeholder="ex : 10.25"
                                value={l.bareme_code}
                                onChange={(e) => updateLine(idx, { bareme_code: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                className="h-8 text-sm"
                                placeholder="ex : Conduit DP Orion Bois"
                                value={l.family_label}
                                onChange={(e) => updateLine(idx, { family_label: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                className={`h-8 font-mono text-sm ${invalid ? "border-warning text-warning" : ""}`}
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
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!formValid || saving || !tenantId}>
              {saving
                ? "Enregistrement…"
                : editingKey
                ? "Enregistrer"
                : grid.mode === "global"
                ? "Enregistrer la remise"
                : "Enregistrer mes remises"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste Dialog */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coller une grille</DialogTitle>
            <DialogDescription>
              Collez votre grille depuis Excel, un PDF ou saisie manuelle.
              Format par ligne : <span className="font-mono">CODE FAMILLE REMISE</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={10}
              className="font-mono text-xs"
              placeholder={`10.25    Conduit DP Orion Bois    50\n16.40.10 Flexible Inox Lisse      70\n20.10    Accessoire Chapeau       45`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Séparateurs acceptés : tabulation (Excel), espaces multiples (PDF) ou
              barre verticale <span className="font-mono">|</span>. Les lignes invalides
              seront marquées à vérifier.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>
              Annuler
            </Button>
            <Button onClick={applyPaste} disabled={!pasteText.trim()}>
              Préremplir le tableau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDeleteGrid} onOpenChange={(o) => !o && setToDeleteGrid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ces remises ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDeleteGrid && (
                <>
                  <strong>{toDeleteGrid.distributor_name}</strong>
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
