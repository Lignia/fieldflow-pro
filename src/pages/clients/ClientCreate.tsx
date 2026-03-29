import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Building2, Landmark, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type CustomerType = "particulier" | "professionnel" | "collectivite";

const TYPE_OPTIONS: { value: CustomerType; label: string; icon: typeof User; desc: string }[] = [
  { value: "particulier", label: "Particulier", icon: User, desc: "Personne physique" },
  { value: "professionnel", label: "Professionnel", icon: Building2, desc: "Entreprise avec SIRET" },
  { value: "collectivite", label: "Collectivité", icon: Landmark, desc: "Mairie, bailleur social…" },
];

const ORIGINS: { value: string; label: string }[] = [
  { value: "phone", label: "Téléphone" },
  { value: "web_form", label: "Formulaire web" },
  { value: "showroom", label: "Showroom" },
  { value: "fair", label: "Salon / Foire" },
  { value: "referral", label: "Recommandation" },
];

export default function ClientCreate() {
  const { tenantId, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [customerType, setCustomerType] = useState<CustomerType>("particulier");

  // Particulier fields
  const [civility, setCivility] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Pro / collectivite
  const [companyName, setCompanyName] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [siret, setSiret] = useState("");
  const [origin, setOrigin] = useState("");

  // Address
  const [addrLine1, setAddrLine1] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrType, setAddrType] = useState("house");

  // Launch project immediately
  const [launchProject, setLaunchProject] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [moreOpen, setMoreOpen] = useState(false);

  // Reset all fields on mount
  useEffect(() => {
    setCivility("");
    setFirstName("");
    setLastName("");
    setCompanyName("");
    setPhone("");
    setEmail("");
    setSiret("");
    setOrigin("");
    setAddrLine1("");
    setAddrPostal("");
    setAddrCity("");
    setAddrType("house");
    setLaunchProject(false);
  }, []);

  const isParticulier = customerType === "particulier";

  const toInitcap = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/clients");
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (isParticulier) {
      if (!firstName.trim()) e.firstName = "Le prénom est obligatoire.";
      if (!lastName.trim()) e.lastName = "Le nom est obligatoire.";
    } else {
      if (!companyName.trim()) e.companyName = "La raison sociale est obligatoire.";
    }
    if (!phone.trim()) e.phone = "Le téléphone est obligatoire.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Format email invalide.";

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
      const insertPayload: Record<string, unknown> = {
        tenant_id: tenantId,
        customer_type: customerType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        siret: siret.trim() || null,
        status: "prospect",
        source_origin: origin || "manual",
      };

      if (isParticulier) {
        insertPayload.civility = civility || null;
        insertPayload.first_name = toInitcap(firstName.trim());
        insertPayload.last_name = lastName.trim().toUpperCase();
      } else {
        insertPayload.company_name = companyName.trim();
      }

      // name is NOT NULL but populated by SQL trigger — send placeholder
      insertPayload.name = "TEMP";

      const { data: newCustomer, error: insertErr } = await coreDb
        .from("customers")
        .insert(insertPayload)
        .select("id, name")
        .single();

      if (insertErr || !newCustomer) {
        const detail = (insertErr as any)?.details ? ` — ${(insertErr as any).details}` : "";
        toast.error(`Erreur : ${insertErr?.message ?? "Création impossible"}${detail}`);
        setSaving(false);
        return;
      }

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

      const displayName = (newCustomer as any).name ?? "Client";
      toast.success(`Client ${displayName} créé`);

      if (launchProject) {
        navigate(`/projects/new?customer=${newCustomer.id}`);
      } else if (redirectTo) {
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
    <div className="max-w-[640px] mx-auto space-y-6 pb-24">
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

      {/* Identity + Phone */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-sm font-semibold">Coordonnées</h2>

          {isParticulier ? (
            <div className="grid grid-cols-[100px_1fr_1fr] gap-3">
              <div>
                <label className="text-sm font-medium">Civilité</label>
                <Select value={civility} onValueChange={setCivility}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prénom *</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                />
                {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Nom *</label>
                <Input
                  value={lastName.toUpperCase()}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="MOREL"
                  className="uppercase"
                />
                {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Raison sociale *</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex : Ambiance Chaleur"
              />
              {errors.companyName && <p className="text-xs text-destructive mt-1">{errors.companyName}</p>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Téléphone *</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Collapsible: Préparer le dossier */}
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
            + Préparer le dossier
            <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-2">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Email */}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.fr" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              {/* SIRET for pros */}
              {!isParticulier && (
                <div>
                  <label className="text-sm font-medium">SIRET</label>
                  <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" maxLength={14} className="font-mono" />
                </div>
              )}

              {/* Origine du contact */}
              <div>
                <label className="text-sm font-medium">Origine du contact</label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger><SelectValue placeholder="Comment vous a-t-il connu ?" /></SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
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

          {/* Launch project checkbox */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="launch-project"
              checked={launchProject}
              onCheckedChange={(checked) => setLaunchProject(checked === true)}
            />
            <label htmlFor="launch-project" className="text-sm font-medium cursor-pointer">
              Lancer un projet immédiatement
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sticky actions */}
      <div className="sticky bottom-0 bg-background border-t py-4 flex justify-end gap-3 -mx-4 px-4">
        <Button variant="outline" onClick={handleBack}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={userLoading || !tenantId || saving}>
          {saving ? "Création…" : "Créer le client"}
        </Button>
      </div>
    </div>
  );
}
