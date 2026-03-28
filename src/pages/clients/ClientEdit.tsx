import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useClientDetail } from "@/hooks/useClientDetail";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { toTitleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type CustomerType = "particulier" | "professionnel" | "collectivite";

export default function ClientEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId, loading: userLoading } = useCurrentUser();
  const { customer, loading, error } = useClientDetail(id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("particulier");
  const [siret, setSiret] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Pre-fill form when customer loads
  useEffect(() => {
    if (customer && !initialized) {
      setName(customer.name);
      setEmail(customer.email ?? "");
      setPhone(customer.phone ?? "");
      setCustomerType(customer.customer_type);
      setSiret(customer.siret ?? "");
      setInitialized(true);
    }
  }, [customer, initialized]);

  // Breadcrumb sync
  useEffect(() => {
    const label = loading ? "..." : (customer?.name ?? "Client introuvable");
    window.history.replaceState(
      { ...window.history.state, breadcrumb: label },
      ""
    );
  }, [loading, customer?.name]);

  const handleBack = () => {
    if (id) navigate(`/clients/${id}`);
    else navigate("/clients");
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Le nom est obligatoire.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Format email invalide.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || !id) return;
    setSaving(true);

    const { error: updateErr } = await coreDb
      .from("customers")
      .update({
        name: toTitleCase(name.trim()),
        email: email.trim() || null,
        phone: phone.trim() || null,
        customer_type: customerType,
        siret: siret.trim() || null,
      })
      .eq("id", id);

    setSaving(false);

    if (updateErr) {
      toast.error("Erreur : " + updateErr.message);
      return;
    }

    toast.success("Client modifié");
    navigate(`/clients/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-muted-foreground">Client introuvable</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> {customer.name}
        </Button>
        <h1 className="text-2xl font-bold">Modifier le client</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold">Type de client</h2>
            <Select value={customerType} onValueChange={(v) => setCustomerType(v as CustomerType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="collectivite">Collectivité</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Coordonnées */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold">Coordonnées</h2>
            <div>
              <label className="text-sm font-medium">
                {customerType === "particulier" ? "Nom complet" : "Raison sociale"} *
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            {customerType !== "particulier" && (
              <div>
                <label className="text-sm font-medium">SIRET</label>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={14} className="font-mono" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={handleBack}>Annuler</Button>
          <Button type="submit" disabled={userLoading || !tenantId || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
