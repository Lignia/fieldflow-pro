import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { CreateCustomerInput } from "@/hooks/useCustomers";

interface CreateCustomerDialogProps {
  onSubmit: (input: CreateCustomerInput) => Promise<{ success: boolean; error?: string }>;
  creating: boolean;
}

export function CreateCustomerDialog({ onSubmit, creating }: CreateCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [customerType, setCustomerType] = useState<CreateCustomerInput["customer_type"]>("particulier");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");

  const reset = () => {
    setName("");
    setCustomerType("particulier");
    setEmail("");
    setPhone("");
    setSiret("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    const result = await onSubmit({
      name: name.trim(),
      customer_type: customerType,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      siret: siret.trim() || undefined,
    });

    if (result.success) {
      toast.success("Client créé avec succès");
      reset();
      setOpen(false);
    } else {
      toast.error(result.error ?? "Erreur lors de la création");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouveau client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              placeholder="Ex : M. Dupont, Entreprise Martin..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={customerType} onValueChange={(v) => setCustomerType(v as CreateCustomerInput["customer_type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="collectivite">Collectivité</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {customerType !== "particulier" && (
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                placeholder="14 chiffres"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                maxLength={14}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
