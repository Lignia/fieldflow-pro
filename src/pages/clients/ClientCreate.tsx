import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Building2, Landmark } from "lucide-react";
import { toast } from "sonner";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";



type CustomerType = "particulier" | "professionnel" | "collectivite";

const TYPE_OPTIONS: { value: CustomerType; label: string; icon: typeof User; desc: string }[] = [
  { value: "particulier", label: "Particulier", icon: User, desc: "Personne physique" },
  { value: "professionnel", label: "Professionnel", icon: Building2, desc: "Entreprise avec SIRET" },
  { value: "collectivite", label: "Collectivité", icon: Landmark, desc: "Mairie, bailleur social…" },
];

const ORIGINS: { value: string; label: string }[] = [
  { value: "manual", label: "Manuel" },
  { value: "phone", label: "Téléphone" },
  { value: "web_form", label: "Formulaire web" },
  { value: "showroom", label: "Showroom" },
  { value: "fair", label: "Salon / Foire" },
  { value: "referral", label: "Recommandation" },
  { value: "partner", label: "Partenaire" },
];

export default function ClientCreate() {
  const { tenantId, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [customerType, setCustomerType] = useState<CustomerType>("particulier");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [origin, setOrigin] = useState("manual");

  // Optional address
  const [addrLine1, setAddrLine1] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrType, setAddrType] = useState("house");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/clients");
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Le nom est obligatoire.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Format email invalide.";
    if (!origin) e.origin = "L'origine est obligatoire.";
    // If partial address, require all fields
    const hasAddr = addrLine1.trim() || addrPostal.trim() || addrCity.trim();
    if (hasAddr) {
      if (!addrLine1.trim()) e.addrLine1 = "Adresse obligatoire.";
      if (!addrPostal.trim()) e.addrPostal = "Code postal obligatoire.";
      if (!addrCity.trim()) e.addrCity = "Ville obligatoire.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const { data: newCustomer, error: insertErr } = await coreDb.from("customers").insert({
        tenant_id: tenantId,
        customer_type: customerType,
        name: toTitleCase(name.trim()),
        email: email.trim() || null,
        phone: phone.trim() || null,
        siret: siret.trim() || null,
        status: "prospect",
        source_origin: origin,
        payload: {},
      }).select("id").single();

      if (insertErr || !newCustomer) {
        toast.error("Erreur : " + (insertErr?.message ?? "Création impossible"));
        setSaving(false);
        return;
      }

      // Create property if address provided
      const hasAddr = addrLine1.trim() && addrPostal.trim() && addrCity.trim();
      if (hasAddr) {
        await coreDb.from("properties").insert({
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          address_line1: addrLine1.trim(),
          postal_code: addrPostal.trim(),
          city: addrCity.trim(),
          property_type: addrType,
        });
      }

      toast.success(`Client ${name} créé`);
      if (redirectTo) {
        navigate(`${redirectTo}?customer=${newCustomer.id}`);
      } else {
        navigate(`/clients/${newCustomer.id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erreur inattendue");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Clients
        </Button>
        <h1 className="text-2xl font-bold">Nouveau client</h1>
      </div>

      {/* Type selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type de client</label>
        <div className="grid grid-cols-3 gap-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <Card
                key={opt.value}
                className={cn(
                  "cursor-pointer transition-colors text-center p-4",
                  customerType === opt.value
                    ? "border-primary ring-1 ring-primary"
                    : "hover:border-muted-foreground/30"
                )}
                onClick={() => setCustomerType(opt.value)}
              >
                <Icon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Coordonnées */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-sm font-semibold">Coordonnées</h2>
          <div>
            <label className="text-sm font-medium">
              {customerType === "particulier" ? "Nom complet" : "Raison sociale"} *
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : M. Jean Morel" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.fr" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
            </div>
          </div>
          {customerType !== "particulier" && (
            <div>
              <label className="text-sm font-medium">SIRET</label>
              <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" maxLength={14} className="font-mono" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Origine */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-sm font-semibold">Origine du contact</h2>
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORIGINS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.origin && <p className="text-xs text-destructive mt-1">{errors.origin}</p>}
        </CardContent>
      </Card>

      {/* Adresse optionnelle */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-sm font-semibold">Adresse principale <span className="text-muted-foreground font-normal">(optionnel)</span></h2>
          <div>
            <label className="text-sm font-medium">Adresse</label>
            <Input value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} placeholder="12 rue des Lilas" />
            {errors.addrLine1 && <p className="text-xs text-destructive mt-1">{errors.addrLine1}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Code postal</label>
              <Input value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} placeholder="73000" />
              {errors.addrPostal && <p className="text-xs text-destructive mt-1">{errors.addrPostal}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Ville</label>
              <Input value={addrCity} onChange={(e) => setAddrCity(e.target.value)} placeholder="Chambéry" />
              {errors.addrCity && <p className="text-xs text-destructive mt-1">{errors.addrCity}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={addrType} onValueChange={setAddrType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="house">Maison</SelectItem>
                <SelectItem value="apartment">Appartement</SelectItem>
                <SelectItem value="commercial">Local commercial</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={handleBack}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={userLoading || !tenantId || saving}>
          {saving ? "Création…" : "Créer le client"}
        </Button>
      </div>
    </div>
  );
}
