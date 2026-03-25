import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CatalogItem, NewItem } from "@/hooks/useCatalog";

const PRODUCT_TYPES = [
  { value: "appliance", label: "Appareil de chauffage", defaultVat: 5.5 },
  { value: "part", label: "Pièce détachée", defaultVat: 10 },
  { value: "service", label: "Prestation", defaultVat: 10 },
  { value: "consumable", label: "Consommable", defaultVat: 10 },
];

const UNITS = [
  { value: "u", label: "Unité (u)" },
  { value: "m", label: "Mètre (m)" },
  { value: "m2", label: "m²" },
  { value: "forfait", label: "Forfait" },
  { value: "h", label: "Heure (h)" },
];

const VAT_RATES = [
  { value: "5.5", label: "5,5 %" },
  { value: "10", label: "10 %" },
  { value: "20", label: "20 %" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: NewItem) => Promise<void>;
  editItem?: CatalogItem | null;
}

export function ItemFormModal({ open, onOpenChange, onSave, editItem }: Props) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("appliance");
  const [unitPriceHt, setUnitPriceHt] = useState("");
  const [vatRate, setVatRate] = useState("5.5");
  const [unit, setUnit] = useState("u");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setSku(editItem.sku || "");
      setDescription(editItem.description || "");
      setProductType(editItem.product_type);
      setUnitPriceHt(String(editItem.unit_price_ht));
      setVatRate(String(editItem.vat_rate));
      setUnit(editItem.unit);
    } else {
      setName("");
      setSku("");
      setDescription("");
      setProductType("appliance");
      setUnitPriceHt("");
      setVatRate("5.5");
      setUnit("u");
    }
  }, [editItem, open]);

  const handleProductTypeChange = (val: string) => {
    setProductType(val);
    const found = PRODUCT_TYPES.find((p) => p.value === val);
    if (found) setVatRate(String(found.defaultVat));
  };

  const handleSubmit = async () => {
    if (!name || !unitPriceHt) return;
    setSaving(true);
    try {
      await onSave({
        name,
        sku: sku || undefined,
        description: description || undefined,
        product_type: productType,
        unit_price_ht: parseFloat(unitPriceHt),
        vat_rate: parseFloat(vatRate),
        unit,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editItem ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="item-name">Désignation *</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Poêle Invicta Onsen 8kW" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="item-sku">Référence fournisseur</Label>
              <Input id="item-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex : INV-ONS-8" className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label>Type *</Label>
              <Select value={productType} onValueChange={handleProductTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea id="item-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description optionnelle" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="item-price">Prix HT *</Label>
              <Input id="item-price" type="number" min="0" step="0.01" value={unitPriceHt} onChange={(e) => setUnitPriceHt(e.target.value)} placeholder="0,00" />
            </div>
            <div className="grid gap-1.5">
              <Label>TVA *</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Unité *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!name || !unitPriceHt || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
