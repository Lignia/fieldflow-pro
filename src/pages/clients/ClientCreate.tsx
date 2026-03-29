import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Building2, Landmark, Info } from "lucide-react";
import { toast } from "sonner";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type CustomerType = "particulier" | "professionnel" | "collectivite";

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
  const [statusType, setStatusType] = useState<"prospect" | "active">("prospect");

  // Particulier fields
  const [civility, setCivility] = useState("M.");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Pro / collectivite
  const [companyName, setCompanyName] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [siret, setSiret] = useState("");
  const [origin, setOrigin] = useState("");

  // Intervention address (primary — stored in properties)
  const [intLine1, setIntLine1] = useState("");
  const [intPostal, setIntPostal] = useState("");
  const [intCity, setIntCity] = useState("");
  const [intType, setIntType] = useState("house");
  const [intOccupant, setIntOccupant] = useState("");

  // Billing address (secondary — stored on customer, only if different)
  const [diffBilling, setDiffBilling] = useState(false);
  const [billingLine1, setBillingLine1] = useState("");
  const [billingPostal, setBillingPostal] = useState("");
  const [billingCity, setBillingCity] = useState("");

  // Next action after creation
  const [nextAction, setNextAction] = useState<'none' | 'project' | 'sav'>('none');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset all fields on mount + pre-fill from ?q
  useEffect(() => {
    setCivility("M.");
    setFirstName("");
    setLastName("");
    setCompanyName("");
    setPhone("");
    setEmail("");
    setSiret("");
    setOrigin("");
    setIntLine1("");
    setIntPostal("");
    setIntCity("");
    setIntType("house");
    setIntOccupant("");
    setDiffBilling(false);
    setBillingLine1("");
    setBillingPostal("");
    setBillingCity("");
    setNextAction('none');
    setStatusType("prospect");

    // Pre-fill from search query param
    const params = new URLSearchParams(location.search);
    const q = params.get("q") ?? "";
    if (q.trim()) {
      const mots = q.trim().split(/\s+/).filter(Boolean);
      if (mots.length === 1) {
        setFirstName(mots[0]);
      } else if (mots.length === 2) {
        setFirstName(mots[0]);
        setLastName(mots[1].toUpperCase());
      } else if (mots.length >= 3) {
        setFirstName(mots[0]);
        setLastName(mots.slice(1).join(" ").toUpperCase());
      }
    }
  }, [location.search]);

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

    // Intervention address is required
    if (!intLine1.trim()) e.intLine1 = "L'adresse d'intervention est obligatoire.";
    if (!intPostal.trim()) e.intPostal = "Code postal obligatoire.";
    if (!intCity.trim()) e.intCity = "Ville obligatoire.";

    // Validate billing address if switch on
    if (diffBilling) {
      if (!billingLine1.trim()) e.billingLine1 = "Adresse obligatoire.";
      if (!billingPostal.trim()) e.billingPostal = "Code postal obligatoire.";
      if (!billingCity.trim()) e.billingCity = "Ville obligatoire.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      // 1. INSERT customer — NO address columns
      const { data: newCustomer, error: insertErr } = await coreDb
        .from("customers")
        .insert({
          tenant_id: tenantId,
          customer_type: customerType,
          status: statusType,
          civility: isParticulier ? civility || null : null,
          first_name: isParticulier ? toInitcap(firstName.trim()) : null,
          last_name: isParticulier ? lastName.trim().toUpperCase() : null,
          company_name: !isParticulier ? companyName.trim() : null,
          siret: siret?.replace(/\s/g, "") || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          source_origin: origin || "manual",
          payload: {},
        })
        .select("id, name")
        .single();

      if (insertErr || !newCustomer) {
        const detail = (insertErr as any)?.details ? ` — ${(insertErr as any).details}` : "";
        toast.error(`Erreur : ${insertErr?.message ?? "Création impossible"}${detail}`);
        setSaving(false);
        return;
      }

      // 2. INSERT intervention address → core.properties
      let newPropertyId: string | null = null;

      if (intLine1.trim() && intPostal.trim() && intCity.trim()) {
        const { data: newProp } = await coreDb
          .from("properties")
          .insert({
            tenant_id: tenantId,
            customer_id: newCustomer.id,
            address_line1: intLine1.trim(),
            postal_code: intPostal.trim(),
            city: intCity.trim(),
            country: "FR",
            property_type: intType || null,
            payload: intOccupant.trim()
              ? { occupant_name: intOccupant.trim() }
              : {},
          })
          .select("id")
          .single();
        if (newProp) newPropertyId = newProp.id;
      }

      // 3. INSERT billing address → core.properties (only if different)
      if (diffBilling && billingLine1.trim() && billingPostal.trim() && billingCity.trim()) {
        await coreDb.from("properties").insert({
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          label: "Adresse de facturation",
          address_line1: billingLine1.trim(),
          postal_code: billingPostal.trim(),
          city: billingCity.trim(),
          country: "FR",
          property_type: null,
          payload: {},
        });
      }

      // 4. Log activity
      await coreDb.from("activities").insert({
        tenant_id: tenantId,
        scope_type: "customer",
        scope_id: newCustomer.id,
        activity_type: "creation",
        payload: { message: "Fiche client créée initialement", source: "App" },
      });

      const displayName = (newCustomer as any).name ?? "Client";
      toast.success(`Client ${displayName} créé`);

      if (nextAction === 'project') {
        if (!newPropertyId) {
          toast.info("Client créé. Vous pourrez ajouter l'adresse d'intervention depuis le projet.");
        }
        navigate(`/projects/new?customer_id=${newCustomer.id}${newPropertyId ? `&property_id=${newPropertyId}` : ''}`);
      } else if (nextAction === 'sav') {
        if (!newPropertyId) {
          toast.info("Client créé. Vous pourrez ajouter l'adresse d'intervention depuis la demande.");
        }
        navigate(`/service-requests/new?customer_id=${newCustomer.id}`);
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
    <div className="max-w-[640px] mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-1 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Clients
          </Button>
          <h1 className="text-xl font-bold">Nouveau client</h1>
        </div>
        {/* Prospect / Client toggle */}
        <div className="flex gap-1.5">
          <Badge
            variant={statusType === "prospect" ? "default" : "outline"}
            className="cursor-pointer select-none"
            onClick={() => setStatusType("prospect")}
          >
            Prospect
          </Badge>
          <Badge
            variant={statusType === "active" ? "default" : "outline"}
            className="cursor-pointer select-none"
            onClick={() => setStatusType("active")}
          >
            Client
          </Badge>
        </div>
      </div>

      {/* Type selector — compact segmented control */}
      <ToggleGroup
        type="single"
        value={customerType}
        onValueChange={(v) => { if (v) setCustomerType(v as CustomerType); }}
        className="w-full"
      >
        <ToggleGroupItem value="particulier" className="flex-1 gap-1.5">
          <User className="h-4 w-4" /> Particulier
        </ToggleGroupItem>
        <ToggleGroupItem value="professionnel" className="flex-1 gap-1.5">
          <Building2 className="h-4 w-4" /> Professionnel
        </ToggleGroupItem>
        <ToggleGroupItem value="collectivite" className="flex-1 gap-1.5">
          <Landmark className="h-4 w-4" /> Collectivité
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Coordonnées — identity, phone, email, origin inline */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <h2 className="text-sm font-semibold">Coordonnées</h2>

          {isParticulier ? (
            <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Civilité</label>
                <Select value={civility} onValueChange={setCivility}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prénom *</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  className="h-9"
                />
                {errors.firstName && <p className="text-xs text-destructive mt-0.5">{errors.firstName}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nom *</label>
                <Input
                  value={lastName.toUpperCase()}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="MOREL"
                  className="h-9 uppercase"
                />
                {errors.lastName && <p className="text-xs text-destructive mt-0.5">{errors.lastName}</p>}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Raison sociale *</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex : Ambiance Chaleur"
                  className="h-9"
                />
                {errors.companyName && <p className="text-xs text-destructive mt-0.5">{errors.companyName}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">SIRET</label>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" maxLength={14} className="h-9 font-mono" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Téléphone *</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" className="h-9" />
              {errors.phone && <p className="text-xs text-destructive mt-0.5">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.fr" className="h-9" />
              {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Origine du contact</label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Comment vous a-t-il connu ?" /></SelectTrigger>
              <SelectContent>
                {ORIGINS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lieu d'intervention — required */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <h2 className="text-sm font-semibold">Lieu d'intervention</h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Adresse *</label>
            <Input value={intLine1} onChange={(e) => setIntLine1(e.target.value)} placeholder="8 impasse du Chêne" className="h-9" />
            {errors.intLine1 && <p className="text-xs text-destructive mt-0.5">{errors.intLine1}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Code postal *</label>
              <Input value={intPostal} onChange={(e) => setIntPostal(e.target.value)} placeholder="73000" className="h-9" />
              {errors.intPostal && <p className="text-xs text-destructive mt-0.5">{errors.intPostal}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ville *</label>
              <Input value={intCity} onChange={(e) => setIntCity(e.target.value)} placeholder="Chambéry" className="h-9" />
              {errors.intCity && <p className="text-xs text-destructive mt-0.5">{errors.intCity}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type de bien</label>
              <Select value={intType} onValueChange={setIntType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">Maison</SelectItem>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="commercial">Local commercial</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <label className="text-xs font-medium text-muted-foreground">Occupant</label>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              <Input
                value={intOccupant}
                onChange={(e) => setIntOccupant(e.target.value)}
                placeholder="M. Dupont (locataire)"
                className="h-9"
              />
            </div>
          </div>

          {/* Toggle: different billing address */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <label htmlFor="diff-billing" className="text-xs font-medium text-muted-foreground cursor-pointer">
              L'adresse de facturation est différente
            </label>
            <Switch
              id="diff-billing"
              checked={diffBilling}
              onCheckedChange={(checked) => {
                setDiffBilling(checked);
                if (!checked) {
                  setBillingLine1("");
                  setBillingPostal("");
                  setBillingCity("");
                }
              }}
            />
          </div>

          {/* Billing Address (conditional — inside same card) */}
          {diffBilling && (
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adresse de facturation</h3>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Adresse *</label>
                <Input value={billingLine1} onChange={(e) => setBillingLine1(e.target.value)} placeholder="12 rue des Lilas" className="h-9" />
                {errors.billingLine1 && <p className="text-xs text-destructive mt-0.5">{errors.billingLine1}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Code postal *</label>
                  <Input value={billingPostal} onChange={(e) => setBillingPostal(e.target.value)} placeholder="73000" className="h-9" />
                  {errors.billingPostal && <p className="text-xs text-destructive mt-0.5">{errors.billingPostal}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Ville *</label>
                  <Input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder="Chambéry" className="h-9" />
                  {errors.billingCity && <p className="text-xs text-destructive mt-0.5">{errors.billingCity}</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next action radio */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <h2 className="text-sm font-semibold">Action après création</h2>
          <RadioGroup value={nextAction} onValueChange={(v) => setNextAction(v as 'none' | 'project' | 'sav')}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="none" id="action-none" />
              <Label htmlFor="action-none" className="font-normal cursor-pointer">Créer la fiche uniquement</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="project" id="action-project" />
              <Label htmlFor="action-project" className="font-normal cursor-pointer">Ouvrir un projet d'installation</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sav" id="action-sav" />
              <Label htmlFor="action-sav" className="font-normal cursor-pointer">Ouvrir une demande SAV</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Sticky actions */}
      <div className="sticky bottom-0 bg-background border-t border-border py-3 flex justify-end gap-3 -mx-4 px-4">
        <Button variant="outline" size="sm" onClick={handleBack}>Annuler</Button>
        <Button size="sm" onClick={handleSubmit} disabled={userLoading || !tenantId || saving}>
          {saving ? "Création…" : nextAction === 'none' ? "Créer le client" : "Créer et continuer →"}
        </Button>
      </div>
    </div>
  );
}
