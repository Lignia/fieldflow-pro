import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, catalogType: string) => Promise<void>;
}

export function CatalogFormModal({ open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState("");
  const [catalogType, setCatalogType] = useState("internal");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), catalogType);
      setName("");
      setCatalogType("internal");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau catalogue</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cat-name">Nom du catalogue *</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Mon tarif 2026" />
          </div>
          <div className="grid gap-1.5">
            <Label>Type *</Label>
            <Select value={catalogType} onValueChange={setCatalogType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Interne (mes propres tarifs)</SelectItem>
                <SelectItem value="supplier">Fournisseur (catalogue reçu)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
