import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Building2, Landmark, ChevronDown, Info } from "lucide-react";
import { toast } from "sonner";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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

  // Billing address (stored on customer)
  const [billingLine1, setBillingLine1] = useState("");
  const [billingPostal, setBillingPostal] = useState("");
  const [billingCity, setBillingCity] = useState("");

  // Intervention address (stored in properties)
  const [diffAddr, setDiffAddr] = useState(false);
  const [intLine1, setIntLine1] = useState("");
  const [intPostal, setIntPostal] = useState("");
  const [intCity, setIntCity] = useState("");
  const [intType, setIntType] = useState("house");
  const [intOccupant, setIntOccupant] = useState("");

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
    setBillingLine1("");
    setBillingPostal("");
    setBillingCity("");
    setDiffAddr(false);
    setIntLine1("");
    setIntPostal("");
    setIntCity("");
    setIntType("house");
    setIntOccupant("");
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

    // Validate billing address if partially filled
    const hasBilling = billingLine1.trim() || billingPostal.trim() || billingCity.trim();
    if (hasBilling) {
      if (!billingLine1.trim()) e.billingLine1 = "Adresse obligatoire.";
      if (!billingPostal.trim()) e.billingPostal = "Code postal obligatoire.";
      if (!billingCity.trim()) e.billingCity = "Ville obligatoire.";
    }

    // Validate intervention address if toggle is on and partially filled
    if (diffAddr) {
      const hasInt = intLine1.trim() || intPostal.trim() || intCity.trim();
      if (hasInt) {
        if (!intLine1.trim()) e.intLine1 = "Adresse obligatoire.";
        if (!intPostal.trim()) e.intPostal = "Code postal obligatoire.";
        if (!intCity.trim()) e.intCity = "Ville obligatoire.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      // Build customer payload — do NOT send `name`, trigger handles it
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

      // Billing address stored on customer columns
      if (billingLine1.trim()) {
        insertPayload.address_line1 = billingLine1.trim();
        insertPayload.postal_code = billingPostal.trim();
        insertPayload.city = billingCity.trim();
      }

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

      // Intervention address → properties table
      if (diffAddr && intLine1.trim() && intPostal.trim() && intCity.trim()) {
        const propPayload: Record<string, unknown> = {
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          address_line1: intLine1.trim(),
          postal_code: intPostal.trim(),
          city: intCity.trim(),
          property_type: intType,
        };
        if (intOccupant.trim()) {
          propPayload.payload = { occupant_name: intOccupant.trim() };
        }
        await coreDb.from("properties").insert(propPayload);
      } else if (!diffAddr && billingLine1.trim()) {
        // Same address for both — also create a property for intervention
        await coreDb.from("properties").insert({
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          address_line1: billingLine1.trim(),
          postal_code: billingPostal.trim(),
          city: billingCity.trim(),
          property_type: "house",
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

          {/* Billing Address */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-sm font-semibold">
                Adresse de facturation
                <span className="text-muted-foreground font-normal ml-1">(optionnel)</span>
              </h2>
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  L'adresse de facturation figurera sur les documents légaux.
                  L'adresse d'intervention servira au planning et aux certificats.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Adresse</label>
                <Input value={billingLine1} onChange={(e) => setBillingLine1(e.target.value)} placeholder="12 rue des Lilas" />
                {errors.billingLine1 && <p className="text-xs text-destructive mt-1">{errors.billingLine1}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Code postal</label>
                  <Input value={billingPostal} onChange={(e) => setBillingPostal(e.target.value)} placeholder="73000" />
                  {errors.billingPostal && <p className="text-xs text-destructive mt-1">{errors.billingPostal}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Ville</label>
                  <Input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder="Chambéry" />
                  {errors.billingCity && <p className="text-xs text-destructive mt-1">{errors.billingCity}</p>}
                </div>
              </div>

              {/* Toggle: different intervention address */}
              <div className="flex items-center justify-between pt-2 border-t">
                <label htmlFor="diff-addr" className="text-sm font-medium cursor-pointer">
                  L'adresse d'intervention est différente
                </label>
                <Switch
                  id="diff-addr"
                  checked={diffAddr}
                  onCheckedChange={setDiffAddr}
                />
              </div>
            </CardContent>
          </Card>

          {/* Intervention Address (conditional) */}
          {diffAddr && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-sm font-semibold">Lieu d'intervention</h2>
                <div>
                  <label className="text-sm font-medium">Adresse</label>
                  <Input value={intLine1} onChange={(e) => setIntLine1(e.target.value)} placeholder="8 impasse du Chêne" />
                  {errors.intLine1 && <p className="text-xs text-destructive mt-1">{errors.intLine1}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Code postal</label>
                    <Input value={intPostal} onChange={(e) => setIntPostal(e.target.value)} placeholder="73000" />
                    {errors.intPostal && <p className="text-xs text-destructive mt-1">{errors.intPostal}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ville</label>
                    <Input value={intCity} onChange={(e) => setIntCity(e.target.value)} placeholder="Chambéry" />
                    {errors.intCity && <p className="text-xs text-destructive mt-1">{errors.intCity}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Type de bien</label>
                  <Select value={intType} onValueChange={setIntType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">Maison</SelectItem>
                      <SelectItem value="apartment">Appartement</SelectItem>
                      <SelectItem value="commercial">Local commercial</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-sm font-medium">Nom de l'occupant / Locataire</label>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    value={intOccupant}
                    onChange={(e) => setIntOccupant(e.target.value)}
                    placeholder="Ex : M. Dupont (locataire)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Utile pour le SAV et les certificats de ramonage.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
