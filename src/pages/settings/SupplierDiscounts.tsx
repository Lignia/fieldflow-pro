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
import { Plus, Pencil, Trash2, Percent, Building2 } from "lucide-react";
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

interface FormState {
  supplier_name: string;
  family_label: string;
  bareme_code: string;
  discount_pct: string;
  valid_from: string;
  valid_until: string;
  notes: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  supplier_name: "",
  family_label: "",
  bareme_code: "",
  discount_pct: "",
  valid_from: todayISO(),
  valid_until: "",
  notes: "",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return d;
  }
}

function isActive(row: SupplierDiscount) {
  const today = todayISO();
  if (row.valid_from && row.valid_from > today) return false;
  if (row.valid_until && row.valid_until < today) return false;
  return true;
}

export default function SupplierDiscounts() {
  const { tenantId, loading: userLoading } = useCurrentUser();
  const [rows, setRows] = useState<SupplierDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierDiscount | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SupplierDiscount | null>(null);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await catalogDb
      .from("tenant_supplier_discounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("supplier_name", { ascending: true });
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
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: SupplierDiscount) => {
    setEditing(row);
    setForm({
      supplier_name: row.supplier_name ?? "",
      family_label: row.family_label ?? "",
      bareme_code: row.bareme_code ?? "",
      discount_pct: row.discount_pct != null ? String(row.discount_pct) : "",
      valid_from: row.valid_from ?? todayISO(),
      valid_until: row.valid_until ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const discountNum = useMemo(() => {
    const n = parseFloat(form.discount_pct.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [form.discount_pct]);

  const formValid =
    form.supplier_name.trim().length > 0 &&
    Number.isFinite(discountNum) &&
    discountNum >= 0 &&
    discountNum <= 100 &&
    form.valid_from.length > 0;

  const previewNet = useMemo(() => {
    if (!Number.isFinite(discountNum)) return null;
    const net = 100 * (1 - discountNum / 100);
    return net.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [discountNum]);

  const handleSave = async () => {
    if (!tenantId) {
      toast.error("Session non résolue, réessayez");
      return;
    }
    if (!formValid) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      supplier_name: form.supplier_name.trim(),
      distributor_name: form.supplier_name.trim(),
      family_label: form.family_label.trim() || null,
      bareme_code: form.bareme_code.trim() || null,
      discount_pct: discountNum,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await catalogDb
          .from("tenant_supplier_discounts")
          .update(payload)
          .eq("id", editing.id)
          .eq("tenant_id", tenantId)
      : await catalogDb.from("tenant_supplier_discounts").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(editing ? "Modification impossible" : "Création impossible", {
        description: error.message,
      });
      return;
    }
    toast.success(editing ? "Remise mise à jour" : "Remise ajoutée");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    loadData();
  };

  const handleDelete = async () => {
    if (!toDelete || !tenantId) return;
    const { error } = await catalogDb
      .from("tenant_supplier_discounts")
      .delete()
      .eq("id", toDelete.id)
      .eq("tenant_id", tenantId);
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
    } else {
      toast.success("Remise supprimée");
      loadData();
    }
    setToDelete(null);
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
            Gérez les remises négociées avec vos fournisseurs d'achat
            (fabricant, grossiste ou distributeur).
          </p>
        </div>
        <Button onClick={openCreate} disabled={!tenantId} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter une remise
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        {loading || userLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucune condition d'achat enregistrée.
            </p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter votre première remise
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur d'achat</TableHead>
                <TableHead>Famille produit</TableHead>
                <TableHead>Code barème</TableHead>
                <TableHead className="text-right">Remise</TableHead>
                <TableHead>Valide depuis</TableHead>
                <TableHead>Valide jusqu'au</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const active = isActive(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.supplier_name}</span>
                        {!active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.family_label || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.bareme_code || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(row.discount_pct).toLocaleString("fr-FR", {
                        maximumFractionDigits: 2,
                      })}
                      &nbsp;%
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(row.valid_from)}</TableCell>
                    <TableCell className="text-sm">{formatDate(row.valid_until)}</TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground max-w-[200px] truncate"
                      title={row.notes ?? ""}
                    >
                      {row.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setToDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la remise" : "Nouvelle remise d'achat"}
            </DialogTitle>
            <DialogDescription>
              Renseignez votre remise négociée avec ce fournisseur d'achat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="supplier_name">
                Fournisseur d'achat <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supplier_name"
                placeholder="Ex : Joncoux, Poujoulat, Cedeo…"
                value={form.supplier_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplier_name: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Fabricant, grossiste ou distributeur.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="family_label">Famille produit</Label>
                <Input
                  id="family_label"
                  placeholder="Ex : Conduits inox"
                  value={form.family_label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, family_label: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bareme_code">Code barème</Label>
                <Input
                  id="bareme_code"
                  placeholder="Ex : B12"
                  value={form.bareme_code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bareme_code: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discount_pct">
                Remise % <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="discount_pct"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  inputMode="decimal"
                  placeholder="0"
                  className="pr-8"
                  value={form.discount_pct}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discount_pct: e.target.value }))
                  }
                />
                <Percent className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              {previewNet && Number.isFinite(discountNum) &&
                discountNum >= 0 && discountNum <= 100 && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                  Pour un article à <span className="font-mono">100,00 € HT</span> →
                  prix net : <span className="font-mono font-medium text-foreground">{previewNet} € HT</span>
                </p>
              )}
              {form.discount_pct &&
                (!Number.isFinite(discountNum) ||
                  discountNum < 0 ||
                  discountNum > 100) && (
                <p className="text-xs text-destructive">
                  La remise doit être comprise entre 0 et 100.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="valid_from">
                  Valide depuis <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={form.valid_from}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valid_from: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_until">Valide jusqu'au</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valid_until: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Conditions particulières, contact commercial…"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formValid || saving || !tenantId}
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette remise ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  Remise {Number(toDelete.discount_pct)} % chez{" "}
                  <strong>{toDelete.supplier_name}</strong>. Cette action est
                  irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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