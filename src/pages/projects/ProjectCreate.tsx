import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, X, Plus, Home, Building2, Store, MapPin, Check, Pencil } from "lucide-react";
import { toast } from "sonner";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCustomerSearch, type CustomerSearchResult } from "@/hooks/useCustomerSearch";
import { useCustomerProperties, type Property } from "@/hooks/useCustomerProperties";
import { CustomerBadge } from "@/components/CustomerBadge";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PROPERTY_TYPE_LABELS: Record<Property["property_type"], string> = {
  house: "Maison", apartment: "Appartement", commercial: "Local commercial", other: "Autre",
};
const PROPERTY_TYPE_ICONS: Record<Property["property_type"], React.ReactNode> = {
  house: <Home className="h-4 w-4" />, apartment: <Building2 className="h-4 w-4" />,
  commercial: <Store className="h-4 w-4" />, other: <MapPin className="h-4 w-4" />,
};

const TOTAL_STEPS = 5;

type YesNoUnknown = "" | "yes" | "no" | "unknown";

// --- Mapping labels lisibles pour la synthèse (n'altère pas les valeurs stockées) ---
const LABELS: Record<string, Record<string, string>> = {
  projectType: {
    installation_neuve: "Première installation",
    remplacement: "Remplacement",
    renovation: "Rénovation",
    construction: "Construction neuve",
    secondary: "Résidence secondaire",
  },
  energyType: {
    wood: "Bois",
    pellet: "Granulés",
    unknown: "À déterminer",
  },
  usageType: {
    main: "Chauffage principal",
    secondary: "Chauffage d'appoint",
    comfort: "Confort / plaisir",
  },
  housingType: {
    house: "Maison",
    apartment: "Appartement",
  },
  currentHeating: {
    electric: "Électrique",
    gas: "Gaz",
    oil: "Fioul",
    other: "Autre",
  },
  insulation: {
    good: "Bien isolé",
    average: "Isolation moyenne",
    poor: "Mal isolé",
    unknown: "Isolation inconnue",
  },
  flueExisting: {
    yes: "Conduit existant",
    no: "Création de conduit",
    unknown: "Conduit à vérifier",
  },
  fluePosition: {
    interior: "Conduit intérieur",
    exterior: "Conduit extérieur",
  },
  flueExit: {
    roof: "Sortie toiture",
    facade: "Sortie façade",
    unknown: "Sortie à définir",
  },
  budget: {
    lt_5k: "Moins de 5 000 €",
    "5k_10k": "5 000 – 10 000 €",
    gt_10k: "Plus de 10 000 €",
    unknown: "Budget à définir",
  },
  horizon: {
    urgent: "Rapidement (< 1 mois)",
    lt_3months: "Dans les prochains mois",
    gt_3months: "Plus tard",
  },
  firePreference: {
    ritual: "Plaisir du feu",
    automation: "Autonomie / programmation",
    both: "Plaisir et autonomie",
  },
  occupancyPattern: {
    often_absent: "Souvent absent en journée",
    variable: "Présence variable",
    often_home: "Souvent à la maison",
  },
};

function label(group: string, value: string | null | undefined): string {
  if (!value) return "—";
  return LABELS[group]?.[value] ?? value;
}

export default function ProjectCreate() {
  const { tenantId, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlCustomerId = searchParams.get("customer_id");
  const urlPropertyId = searchParams.get("property_id");

  // --- Customer search (LOGIQUE INTACTE) ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const { results: customerResults, loading: searchLoading } = useCustomerSearch(searchTerm);

  // --- Properties (LOGIQUE INTACTE) ---
  const { properties, loading: propsLoading, refetch: refetchProps } = useCustomerProperties(selectedCustomer?.id ?? null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ address_line1: "", address_line2: "", postal_code: "", city: "", property_type: "house" as Property["property_type"] });
  const [creatingAddr, setCreatingAddr] = useState(false);

  // --- Mode compact bandeau ---
  const [forceEditClient, setForceEditClient] = useState(false);
  const clientReady = !!selectedCustomer && !!selectedPropertyId;
  const showClientFull = !clientReady || forceEditClient;

  // --- Qualification ---
  const [currentStep, setCurrentStep] = useState(1);

  // Bloc 1
  const [projectType, setProjectType] = useState("");
  const [energyType, setEnergyType] = useState("");
  const [usageType, setUsageType] = useState("");
  const [firePreference, setFirePreference] = useState("");

  // Bloc 2
  const [housingType, setHousingType] = useState("");
  const [currentHeating, setCurrentHeating] = useState("");
  const [surfaceM2, setSurfaceM2] = useState<number>(80);
  const [insulation, setInsulation] = useState("");
  const [occupancyPattern, setOccupancyPattern] = useState("");

  // Bloc 3
  const [flueExisting, setFlueExisting] = useState("");
  const [fluePosition, setFluePosition] = useState("");
  const [flueComplexity, setFlueComplexity] = useState("");
  const [flueExit, setFlueExit] = useState("");
  const [flueLevel, setFlueLevel] = useState("");

  // Bloc 4
  const [airInlet, setAirInlet] = useState<YesNoUnknown>("");
  const [vmc, setVmc] = useState<YesNoUnknown>("");
  const [combustibleWall, setCombustibleWall] = useState<YesNoUnknown>("");

  // Bloc 5
  const [budget, setBudget] = useState("");
  const [horizon, setHorizon] = useState("");

  // --- Submission ---
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ customer?: string; property?: string; projectType?: string }>({});

  // Reset énergie/usage si projectType change
  useEffect(() => {
    setEnergyType("");
    setUsageType("");
  }, [projectType]);

  // Reset branches fumisterie
  useEffect(() => {
    if (flueExisting === "yes") {
      setFlueExit("");
      setFlueLevel("");
    } else if (flueExisting === "no") {
      setFluePosition("");
      setFlueComplexity("");
    } else if (flueExisting === "unknown") {
      setFluePosition("");
      setFlueComplexity("");
      setFlueExit("");
      setFlueLevel("");
    }
  }, [flueExisting]);

  // --- Pre-fill from URL params (INTACT) ---
  useEffect(() => {
    if (!urlCustomerId) return;
    setIsLoadingClient(true);

    (async () => {
      try {
        const { data, error } = await (coreDb as any)
          .from("customers")
          .select("id, first_name, last_name, company_name, civility, customer_type, email")
          .eq("id", urlCustomerId)
          .maybeSingle();

        if (error || !data) {
          toast.error("Client introuvable");
          setIsLoadingClient(false);
          return;
        }

        const name = data.customer_type === "particulier"
          ? [data.civility, data.first_name, data.last_name].filter(Boolean).join(" ")
          : data.company_name || "Client";

        setSelectedCustomer({
          id: data.id,
          name,
          email: data.email ?? "",
          phone: "",
          customer_type: data.customer_type,
        });
        toast.success("Client rattaché automatiquement.");
      } catch {
        toast.error("Erreur lors du chargement du client");
      } finally {
        setIsLoadingClient(false);
      }
    })();
  }, [urlCustomerId]);

  useEffect(() => {
    if (urlPropertyId && properties.length > 0 && !selectedPropertyId) {
      const match = properties.find((p) => p.id === urlPropertyId);
      if (match) setSelectedPropertyId(match.id);
    }
  }, [urlPropertyId, properties, selectedPropertyId]);

  const isCustomerLocked = !!urlCustomerId && !!selectedCustomer;

  const selectCustomer = (c: CustomerSearchResult) => {
    setSelectedCustomer(c);
    setSearchTerm("");
    setSelectedPropertyId(null);
    setShowNewAddress(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSelectedPropertyId(null);
    setShowNewAddress(false);
    setForceEditClient(false);
  };

  // --- Create inline address (INTACT) ---
  const handleCreateAddress = async () => {
    if (!selectedCustomer || !newAddr.address_line1 || !newAddr.postal_code || !newAddr.city) return;
    setCreatingAddr(true);

    try {
      const { data, error } = await (coreDb as any)
        .from("properties")
        .insert({
          tenant_id: tenantId,
          customer_id: selectedCustomer.id,
          address_line1: newAddr.address_line1,
          address_line2: newAddr.address_line2 || null,
          postal_code: newAddr.postal_code,
          city: newAddr.city,
          property_type: newAddr.property_type,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Adresse ajoutée");
      await refetchProps();
      setSelectedPropertyId(data.id);
      setShowNewAddress(false);
      setNewAddr({ address_line1: "", address_line2: "", postal_code: "", city: "", property_type: "house" });
    } catch (e: any) {
      toast.error("Erreur lors de la création de l'adresse", { description: e.message });
    } finally {
      setCreatingAddr(false);
    }
  };

  // --- Calculs dérivés ---
  const estimatedPower = useMemo(() => {
    const ci = insulation === "good" ? 0.07 : insulation === "average" ? 0.09 : insulation === "poor" ? 0.11 : 0.09;
    const cu = usageType === "main" ? 1.0 : usageType === "secondary" ? 0.75 : usageType === "comfort" ? 0.55 : 1.0;
    return Math.round(surfaceM2 * ci * cu * 2) / 2;
  }, [surfaceM2, insulation, usageType]);

  const powerColor = estimatedPower < 8 ? "bg-success/15 text-success border-success/30"
    : estimatedPower <= 12 ? "bg-warning/15 text-warning border-warning/30"
    : "bg-orange-500/15 text-orange-600 border-orange-500/30";

  const flueScenario = useMemo(() => {
    if (flueExisting === "yes" && fluePosition === "interior" && flueComplexity === "straight")
      return { label: "🟢 Pose standard", className: "bg-success/15 text-success border-success/30" };
    if (flueExisting === "yes" && fluePosition === "exterior")
      return { label: "🟡 Conduit à vérifier", className: "bg-warning/15 text-warning border-warning/30" };
    if (flueExisting === "yes" && (flueComplexity === "unknown" || (!flueComplexity && fluePosition)))
      return { label: "🟡 À préciser", className: "bg-warning/15 text-warning border-warning/30" };
    if (flueExisting === "no" && flueExit === "roof")
      return { label: "🟠 Création conduit toiture", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" };
    if (flueExisting === "no" && flueExit === "facade")
      return { label: "🔴 Conduit façade — surcoût", className: "bg-destructive/15 text-destructive border-destructive/30" };
    if (flueExisting === "unknown")
      return { label: "⚪ À évaluer en VT", className: "bg-muted text-muted-foreground border-border" };
    return null;
  }, [flueExisting, fluePosition, flueComplexity, flueExit]);

  // Score fiabilité
  const qualificationScore = useMemo(() => {
    let s = 0;
    if (flueExisting === "yes") s += 1;
    if (fluePosition) s += 1;
    if (insulation && insulation !== "unknown") s += 1;
    if (housingType) s += 1;
    if (airInlet && airInlet !== "unknown") s += 1;
    if (flueExisting === "no") s -= 1;
    if (vmc === "yes" && airInlet === "no") s -= 1;
    if (combustibleWall === "yes") s -= 1;
    if (housingType === "apartment" && flueExit === "facade") s -= 2;
    return Math.max(0, Math.min(5, s));
  }, [flueExisting, fluePosition, insulation, housingType, airInlet, vmc, combustibleWall, flueExit]);

  const reliabilityBadge = qualificationScore >= 3
    ? { label: "🟢 Estimatif fiable", className: "bg-success/15 text-success border-success/30" }
    : qualificationScore >= 1
    ? { label: "🟡 Estimatif approximatif", className: "bg-warning/15 text-warning border-warning/30" }
    : { label: "🔴 À confirmer en visite", className: "bg-destructive/15 text-destructive border-destructive/30" };

  // Validations par bloc
  const canNext1 = !!projectType;
  const canNext2 = !!housingType && !!surfaceM2;
  const canNext3 = flueExisting === "unknown" || (flueExisting === "yes" && !!fluePosition) || (flueExisting === "no" && !!flueExit);
  const canNext4 = true;
  const canSubmit = canNext1 && canNext2 && canNext3 && !!budget;

  // --- Submit project ---
  const handleSubmit = async (intent: "estimate" | "visit" = "estimate") => {
    const newErrors: typeof errors = {};
    if (!selectedCustomer) newErrors.customer = "Veuillez sélectionner un client.";
    if (!selectedPropertyId) newErrors.property = "Veuillez sélectionner une adresse.";
    if (!projectType) newErrors.projectType = "Veuillez sélectionner le type de projet.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);

    try {
      const fullyQualified = !!projectType && !!housingType && !!surfaceM2 && !!flueExisting && !!budget;
      const status = fullyQualified ? "lead_qualified" : "lead_new";

      const { data, error } = await (coreDb as any)
        .from("projects")
        .insert({
          tenant_id: tenantId,
          customer_id: selectedCustomer!.id,
          property_id: selectedPropertyId,
          status,
          origin: "manual",
          payload: {
            project_type: projectType,
            energy_type: energyType || null,
            usage_type: usageType || null,
            housing_type: housingType || null,
            current_heating: currentHeating || null,
            surface_m2: surfaceM2,
            insulation: insulation || null,
            estimated_power_kw: estimatedPower,
            flue_existing: flueExisting || null,
            flue_position: fluePosition || null,
            flue_complexity: flueComplexity || null,
            flue_exit: flueExit || null,
            flue_level: flueLevel || null,
            flue_scenario: flueScenario?.label ?? null,
            air_inlet: airInlet || null,
            vmc: vmc || null,
            combustible_wall: combustibleWall || null,
            budget: budget || null,
            horizon: horizon || null,
            qualification_score: qualificationScore,
            reliability_badge: reliabilityBadge.label,
            qualified_at: new Date().toISOString(),
            fire_preference: firePreference || null,
            occupancy_pattern: occupancyPattern || null,
            surface_m2_source: "user",
            surface_m2_confidence: insulation && insulation !== "unknown" ? "medium" : "low",
            insulation_source: "user",
            insulation_confidence: insulation && insulation !== "unknown" ? "medium" : "low",
            current_heating_source: "user",
            current_heating_confidence: currentHeating ? "medium" : "low",
          },
        })
        .select("id, project_number")
        .single();

      if (error) throw error;
      toast.success(`Projet ${data.project_number} créé`);
      if (intent === "estimate") {
        navigate(`/projects/${data.id}?tab=commercial`);
      } else {
        navigate(`/projects/${data.id}`);
      }
    } catch (e: any) {
      toast.error("Erreur lors de la création du projet", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[680px] px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2 text-muted-foreground"
            onClick={() => {
              if (urlCustomerId) navigate(`/clients/${urlCustomerId}`);
              else navigate("/projects");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {urlCustomerId ? "Retour à la fiche client" : "Annuler"}
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nouveau projet</h1>
        </div>

        {/* SECTION CLIENT — bandeau compact si prêt */}
        {clientReady && !showClientFull ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-xs">
                  {selectedCustomer!.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-foreground truncate">
                  <span className="font-medium">{selectedCustomer!.name}</span>
                  {selectedProperty && (
                    <span className="text-muted-foreground">
                      {" · "}{selectedProperty.address_line1}, {selectedProperty.city}
                    </span>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setForceEditClient(true)} className="text-xs text-muted-foreground gap-1 shrink-0">
                <Pencil className="h-3 w-3" /> modifier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* SECTION 1 — Client */}
            <section className="space-y-3">
              <Label className="text-base font-semibold">Client</Label>

              {isLoadingClient ? (
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ) : selectedCustomer ? (
                <Card className="border-accent/30 bg-accent/5">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold text-sm">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{selectedCustomer.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                      </div>
                      <CustomerBadge customerType={selectedCustomer.customer_type} />
                    </div>
                    {!isCustomerLocked && (
                      <Button variant="ghost" size="icon" onClick={clearCustomer} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un client..."
                    className="pl-9"
                  />
                  {searchTerm.length >= 2 && (
                    <Card className="absolute z-20 mt-1 w-full shadow-lg border">
                      <CardContent className="p-1">
                        {searchLoading ? (
                          <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                        ) : customerResults.length > 0 ? (
                          customerResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                              </div>
                              <CustomerBadge customerType={c.customer_type} />
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center space-y-2">
                            <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => navigate(`/clients/new?redirect=/projects/new`)}
                              className="text-accent"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Créer un nouveau client
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              {errors.customer && <p className="text-sm text-destructive">{errors.customer}</p>}
            </section>

            {/* SECTION 2 — Adresse */}
            {selectedCustomer && (
              <section className="space-y-3">
                <Label className="text-base font-semibold">Adresse d'intervention</Label>

                {propsLoading ? (
                  <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
                ) : (
                  <>
                    {properties.length > 0 && (
                      <div className="grid gap-2">
                        {properties.map((p) => {
                          const selected = selectedPropertyId === p.id;
                          return (
                            <Card
                              key={p.id}
                              onClick={() => { setSelectedPropertyId(p.id); setShowNewAddress(false); }}
                              className={`cursor-pointer transition-all ${selected ? "border-accent ring-1 ring-accent/30 bg-accent/5" : "hover:border-muted-foreground/30"}`}
                            >
                              <CardContent className="flex items-center gap-3 p-4">
                                <div className="shrink-0 text-muted-foreground">{PROPERTY_TYPE_ICONS[p.property_type]}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground">{p.address_line1}</p>
                                  <p className="text-xs text-muted-foreground">{p.postal_code} {p.city}</p>
                                </div>
                                <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                                  {PROPERTY_TYPE_LABELS[p.property_type]}
                                </span>
                                {selected && <Check className="h-4 w-4 text-accent shrink-0" />}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {!showNewAddress ? (
                      <Button variant="outline" size="sm" onClick={() => { setShowNewAddress(true); setSelectedPropertyId(null); }}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une nouvelle adresse
                      </Button>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">Nouvelle adresse</p>
                          <div className="space-y-2">
                            <Input placeholder="Adresse *" value={newAddr.address_line1} onChange={(e) => setNewAddr((s) => ({ ...s, address_line1: e.target.value }))} />
                            <Input placeholder="Complément (optionnel)" value={newAddr.address_line2} onChange={(e) => setNewAddr((s) => ({ ...s, address_line2: e.target.value }))} />
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Code postal *" value={newAddr.postal_code} onChange={(e) => setNewAddr((s) => ({ ...s, postal_code: e.target.value }))} />
                              <Input placeholder="Ville *" value={newAddr.city} onChange={(e) => setNewAddr((s) => ({ ...s, city: e.target.value }))} />
                            </div>
                            <Select value={newAddr.property_type} onValueChange={(v) => setNewAddr((s) => ({ ...s, property_type: v as Property["property_type"] }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="house">Maison</SelectItem>
                                <SelectItem value="apartment">Appartement</SelectItem>
                                <SelectItem value="commercial">Local commercial</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setShowNewAddress(false)}>Annuler</Button>
                            <Button
                              size="sm"
                              disabled={creatingAddr || !newAddr.address_line1 || !newAddr.postal_code || !newAddr.city}
                              onClick={handleCreateAddress}
                            >
                              {creatingAddr ? "Création…" : "Ajouter"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
                {errors.property && <p className="text-sm text-destructive">{errors.property}</p>}

                {clientReady && forceEditClient && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setForceEditClient(false)}>
                      Valider
                    </Button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* QUALIFICATION — visible uniquement si client + adresse OK */}
        {clientReady && !showClientFull && (
          <>
            {/* Barre de progression */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-1">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                    const step = i + 1;
                    return (
                      <button
                        key={step}
                        onClick={() => setCurrentStep(step)}
                        className={cn(
                          "h-1.5 w-10 rounded-full transition-colors",
                          step <= currentStep ? "bg-primary" : "bg-muted"
                        )}
                        aria-label={`Étape ${step}`}
                      />
                    );
                  })}
                </div>
                <span>Étape {currentStep} / {TOTAL_STEPS}</span>
              </div>
              <Progress value={currentStep * 20} className="h-1" />
            </div>

            {/* BLOC 1 — Type projet */}
            {currentStep === 1 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Parlez-moi de votre projet</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Pour orienter le bon appareil</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Vous êtes dans quel cas ? *</Label>
                  <ToggleGroup
                    type="single"
                    value={projectType}
                    onValueChange={(v) => v && setProjectType(v)}
                    className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                  >
                    <ToggleGroupItem value="installation_neuve" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🔨</span>
                      <span className="text-xs font-medium">Première installation</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="remplacement" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🔄</span>
                      <span className="text-xs font-medium">Remplacement</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="renovation" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🏠</span>
                      <span className="text-xs font-medium">Rénovation</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="construction" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🏗️</span>
                      <span className="text-xs font-medium">Construction neuve</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="secondary" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🌿</span>
                      <span className="text-xs font-medium">Résidence secondaire</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Énergie souhaitée</Label>
                  <ToggleGroup
                    type="single"
                    value={energyType}
                    onValueChange={(v) => setEnergyType(v ?? "")}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem value="wood" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🪵</span><span className="text-xs">Bois</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pellet" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🟤</span><span className="text-xs">Granulés</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unknown" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">❓</span><span className="text-xs">Je ne sais pas</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Usage</Label>
                  <ToggleGroup
                    type="single"
                    value={usageType}
                    onValueChange={(v) => setUsageType(v ?? "")}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem value="main" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🔥</span><span className="text-xs">Chauffage principal</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="secondary" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🌡️</span><span className="text-xs">Appoint</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="comfort" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">✨</span><span className="text-xs">Confort</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Vous préférez plutôt ?</Label>
                  <ToggleGroup
                    type="single"
                    value={firePreference}
                    onValueChange={(v) => setFirePreference(v ?? "")}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem value="ritual" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🪵</span>
                      <span className="text-xs font-medium">Le plaisir du feu</span>
                      <span className="text-[10px] text-muted-foreground">Bûches, flammes, rituel</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="automation" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🤖</span>
                      <span className="text-xs font-medium">L'autonomie</span>
                      <span className="text-[10px] text-muted-foreground">Programmation, confort</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="both" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">⚖️</span>
                      <span className="text-xs font-medium">Les deux</span>
                      <span className="text-[10px] text-muted-foreground">Plaisir et simplicité</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                  {firePreference === "ritual" && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">🪵 Bois recommandé</Badge>
                  )}
                  {firePreference === "automation" && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">🤖 Granulés recommandés</Badge>
                  )}
                  {firePreference === "both" && (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-xs">⚖️ Bois ou granulés possibles</Badge>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setCurrentStep(2)} disabled={!canNext1}>Suivant →</Button>
                </div>
              </section>
            )}

            {/* BLOC 2 — Logement */}
            {currentStep === 2 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Parlez-moi de votre maison</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Pour estimer la puissance nécessaire</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Type *</Label>
                  <ToggleGroup
                    type="single"
                    value={housingType}
                    onValueChange={(v) => v && setHousingType(v)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <ToggleGroupItem value="house" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🏠</span><span className="text-xs font-medium">Maison</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="apartment" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">🏢</span><span className="text-xs font-medium">Appartement</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Aujourd'hui vous chauffez avec :</Label>
                  <ToggleGroup
                    type="single"
                    value={currentHeating}
                    onValueChange={(v) => setCurrentHeating(v ?? "")}
                    className="grid grid-cols-4 gap-2"
                  >
                    <ToggleGroupItem value="electric" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">⚡</span><span className="text-xs">Électrique</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="gas" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🔥</span><span className="text-xs">Gaz</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="oil" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🛢️</span><span className="text-xs">Fioul</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="other" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">❓</span><span className="text-xs">Autre</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Vous êtes souvent à la maison ?</Label>
                  <ToggleGroup
                    type="single"
                    value={occupancyPattern}
                    onValueChange={(v) => setOccupancyPattern(v ?? "")}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem value="often_absent" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🏢</span><span className="text-xs">Souvent absent en journée</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="variable" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🏠</span><span className="text-xs">Présence variable</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="often_home" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🛋️</span><span className="text-xs">Souvent à la maison</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                  {occupancyPattern === "often_absent" && (
                    <p className="text-xs text-muted-foreground italic">💡 Un poêle programmable peut être plus adapté</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Quelle surface voulez-vous chauffer ? *</Label>
                    <span className="text-sm font-mono font-semibold text-foreground">{surfaceM2} m²</span>
                  </div>
                  <Slider
                    min={20}
                    max={300}
                    step={5}
                    value={[surfaceM2]}
                    onValueChange={([v]) => setSurfaceM2(v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Isolation</Label>
                  <ToggleGroup
                    type="single"
                    value={insulation}
                    onValueChange={(v) => setInsulation(v ?? "")}
                    className="grid grid-cols-4 gap-2"
                  >
                    <ToggleGroupItem value="good" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">✅</span><span className="text-xs">Bien isolé</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="average" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">➖</span><span className="text-xs">Moyen</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="poor" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">❌</span><span className="text-xs">Mal isolé</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unknown" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">❓</span><span className="text-xs">Je ne sais pas</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-1.5">
                  <Badge className={cn("text-sm font-mono px-3 py-1", powerColor)} variant="outline">
                    ~{estimatedPower} kW indicatif
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {estimatedPower < 5
                      ? "Adapté à un petit espace ou un usage d'appoint"
                      : estimatedPower < 9
                      ? "Adapté à une pièce principale ou maison bien isolée"
                      : estimatedPower < 14
                      ? "Adapté à une grande surface ou logement moins isolé"
                      : "À confirmer avec une visite technique"}
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(1)}>← Retour</Button>
                  <Button onClick={() => setCurrentStep(3)} disabled={!canNext2}>Suivant →</Button>
                </div>
              </section>
            )}

            {/* BLOC 3 — Fumisterie */}
            {currentStep === 3 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Ce qui existe déjà chez vous</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">C'est ce qui impacte le prix et la faisabilité</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Est-ce qu'il y a déjà un conduit ? *</Label>
                  <ToggleGroup
                    type="single"
                    value={flueExisting}
                    onValueChange={(v) => v && setFlueExisting(v)}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem value="yes" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">✅</span><span className="text-xs font-medium">Oui</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="no" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">❌</span><span className="text-xs font-medium">Non</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unknown" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-xl">❓</span><span className="text-xs font-medium">Je ne sais pas</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {flueExisting === "yes" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Il est positionné comment ? *</Label>
                      <ToggleGroup
                        type="single"
                        value={fluePosition}
                        onValueChange={(v) => v && setFluePosition(v)}
                        className="grid grid-cols-2 gap-2"
                      >
                        <ToggleGroupItem value="interior" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🏠</span><span className="text-xs">À l'intérieur</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="exterior" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🌳</span><span className="text-xs">En façade extérieure</span>
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Il est plutôt :</Label>
                      <ToggleGroup
                        type="single"
                        value={flueComplexity}
                        onValueChange={(v) => setFlueComplexity(v ?? "")}
                        className="grid grid-cols-3 gap-2"
                      >
                        <ToggleGroupItem value="straight" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">📏</span><span className="text-xs">Tout droit</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="with_bends" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🔄</span><span className="text-xs">Avec coudes</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="unknown" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">❓</span><span className="text-xs">Je ne sais pas</span>
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </>
                )}

                {flueExisting === "no" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">La sortie serait plutôt : *</Label>
                      <ToggleGroup
                        type="single"
                        value={flueExit}
                        onValueChange={(v) => v && setFlueExit(v)}
                        className="grid grid-cols-3 gap-2"
                      >
                        <ToggleGroupItem value="roof" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🏠</span><span className="text-xs">Par le toit</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="facade" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🧱</span><span className="text-xs">En façade</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="unknown" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">❓</span><span className="text-xs">Je ne sais pas</span>
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Le poêle serait installé :</Label>
                      <ToggleGroup
                        type="single"
                        value={flueLevel}
                        onValueChange={(v) => setFlueLevel(v ?? "")}
                        className="grid grid-cols-2 gap-2"
                      >
                        <ToggleGroupItem value="ground" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🏠</span><span className="text-xs">Au rez-de-chaussée</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="upper" className="h-auto flex-col gap-1 py-2.5 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                          <span className="text-lg">🏢</span><span className="text-xs">À l'étage</span>
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </>
                )}

                {flueScenario && (
                  <div className="space-y-1.5">
                    <Badge className={cn("text-sm px-3 py-1", flueScenario.className)} variant="outline">
                      {flueScenario.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {flueScenario.label.startsWith("🟢")
                        ? "Configuration favorable"
                        : flueScenario.label.startsWith("🟡")
                        ? "À confirmer lors de la visite technique"
                        : flueScenario.label.startsWith("🟠")
                        ? "Surcoût potentiel à évaluer"
                        : flueScenario.label.startsWith("🔴")
                        ? "Impact important sur le prix"
                        : "À vérifier en visite technique"}
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)}>← Retour</Button>
                  <Button onClick={() => setCurrentStep(4)} disabled={!canNext3}>Suivant →</Button>
                </div>
              </section>
            )}

            {/* BLOC 4 — Contraintes */}
            {currentStep === 4 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Quelques points techniques rapides</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Pour anticiper la visite et éviter les surprises</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ConstraintCard icon="🌬️" label="L'air arrive facilement dans la pièce ?" hint="Grille ou arrivée d'air existante" value={airInlet} onChange={setAirInlet} />
                  <ConstraintCard icon="🔄" label="Il y a une VMC ?" hint="Ventilation mécanique du logement" value={vmc} onChange={setVmc} />
                  <ConstraintCard icon="🧱" label="Le mur derrière est en bois ou fragile ?" hint="Lambris, bardage, bois massif…" value={combustibleWall} onChange={setCombustibleWall} />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(3)}>← Retour</Button>
                  <Button onClick={() => setCurrentStep(5)}>Suivant →</Button>
                </div>
              </section>
            )}

            {/* BLOC 5 — Commercial */}
            {currentStep === 5 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">On se projette sur votre projet</h2>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Vous aviez quel budget en tête ? *</Label>
                  <ToggleGroup
                    type="single"
                    value={budget}
                    onValueChange={(v) => v && setBudget(v)}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    <ToggleGroupItem value="lt_5k" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">💰</span><span className="text-xs">&lt; 5 000€</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="5k_10k" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">💰💰</span><span className="text-xs">5 000 – 10 000€</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="gt_10k" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">💰💰💰</span><span className="text-xs">&gt; 10 000€</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unknown" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">❓</span><span className="text-xs">Ne sait pas</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Vous souhaitez installer :</Label>
                  <ToggleGroup
                    type="single"
                    value={horizon}
                    onValueChange={(v) => setHorizon(v ?? "")}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem value="urgent" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">⚡</span><span className="text-xs">Rapidement</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="lt_3months" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">📅</span><span className="text-xs">Dans les prochains mois</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="gt_3months" className="h-auto flex-col gap-1 py-3 data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent border">
                      <span className="text-lg">🗓️</span><span className="text-xs">Plus tard</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* RÉSUMÉ */}
                <Card className="border-accent/30 bg-accent/[0.03]">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">Récapitulatif du projet</p>
                      <Badge className={cn("text-xs", reliabilityBadge.className)} variant="outline">
                        {reliabilityBadge.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PROJET */}
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Projet</p>
                        <dl className="space-y-1 text-sm">
                          {projectType && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Type</dt>
                              <dd className="font-medium text-right">{label("projectType", projectType)}</dd>
                            </div>
                          )}
                          {energyType && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Énergie</dt>
                              <dd className="font-medium text-right">{label("energyType", energyType)}</dd>
                            </div>
                          )}
                          {usageType && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Usage</dt>
                              <dd className="font-medium text-right">{label("usageType", usageType)}</dd>
                            </div>
                          )}
                          {firePreference && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Préférence</dt>
                              <dd className="font-medium text-right">{label("firePreference", firePreference)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* LOGEMENT */}
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Logement</p>
                        <dl className="space-y-1 text-sm">
                          {housingType && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Type</dt>
                              <dd className="font-medium text-right">{label("housingType", housingType)}</dd>
                            </div>
                          )}
                          <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Surface</dt>
                            <dd className="font-medium text-right font-mono">{surfaceM2} m²</dd>
                          </div>
                          {insulation && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Isolation</dt>
                              <dd className="font-medium text-right">{label("insulation", insulation)}</dd>
                            </div>
                          )}
                          {currentHeating && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Chauffage actuel</dt>
                              <dd className="font-medium text-right">{label("currentHeating", currentHeating)}</dd>
                            </div>
                          )}
                          {occupancyPattern && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Présence</dt>
                              <dd className="font-medium text-right">{label("occupancyPattern", occupancyPattern)}</dd>
                            </div>
                          )}
                          <div className="flex justify-between gap-3 pt-1 border-t border-border/40">
                            <dt className="text-muted-foreground">Puissance indicative</dt>
                            <dd className="font-mono font-semibold text-right">~{estimatedPower} kW</dd>
                          </div>
                        </dl>
                      </div>

                      {/* FUMISTERIE */}
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Fumisterie</p>
                        <div className="space-y-2 text-sm">
                          {flueScenario ? (
                            <Badge variant="outline" className={cn("text-xs", flueScenario.className)}>
                              {flueScenario.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/40">
                              ⚠ À vérifier en visite technique
                            </Badge>
                          )}
                          <dl className="space-y-1">
                            {flueExisting && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Conduit</dt>
                                <dd className="font-medium text-right">{label("flueExisting", flueExisting)}</dd>
                              </div>
                            )}
                            {fluePosition && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Position</dt>
                                <dd className="font-medium text-right">{label("fluePosition", fluePosition)}</dd>
                              </div>
                            )}
                            {flueExit && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Sortie</dt>
                                <dd className="font-medium text-right">{label("flueExit", flueExit)}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>

                      {/* BUDGET & DÉLAI */}
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Budget & Délai</p>
                        <dl className="space-y-1 text-sm">
                          {budget && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Budget</dt>
                              <dd className="font-medium text-right">{label("budget", budget)}</dd>
                            </div>
                          )}
                          {horizon && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">Délai</dt>
                              <dd className="font-medium text-right">{label("horizon", horizon)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60">
                      <p className="text-sm font-medium">
                        {qualificationScore >= 4
                          ? "✅ Qualification solide — estimatif exploitable"
                          : qualificationScore >= 2
                          ? "⚠️ Qualification partielle — visite technique recommandée"
                          : "🔴 Informations insuffisantes — visite technique nécessaire"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-2 pb-8">
                  <Button variant="ghost" onClick={() => setCurrentStep(4)}>← Retour</Button>
                  <Button
                    size="lg"
                    disabled={userLoading || !tenantId || submitting || !canSubmit}
                    onClick={handleSubmit}
                    className="min-w-[220px]"
                  >
                    {submitting
                      ? "Création en cours…"
                      : qualificationScore >= 4
                      ? "Créer le projet et préparer un devis"
                      : "Créer le projet et planifier la visite"}
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Helpers internes ---

function ConstraintCard({
  icon, label, hint, value, onChange,
}: {
  icon: string;
  label: string;
  hint?: string;
  value: YesNoUnknown;
  onChange: (v: YesNoUnknown) => void;
}) {
  const badgeFor = (v: YesNoUnknown) =>
    v === "yes" ? "bg-success/15 text-success border-success/30"
    : v === "no" ? "bg-orange-500/15 text-orange-600 border-orange-500/30"
    : v === "unknown" ? "bg-muted text-muted-foreground border-border"
    : "";

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground flex items-start gap-1.5">
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </p>
          {hint && <p className="text-[10px] text-muted-foreground pl-6">{hint}</p>}
        </div>
        <ToggleGroup
          type="single"
          value={value}
          onValueChange={(v) => onChange((v as YesNoUnknown) ?? "")}
          className="grid grid-cols-3 gap-1"
        >
          <ToggleGroupItem value="yes" className="h-7 text-xs data-[state=on]:bg-success/10 data-[state=on]:border-success data-[state=on]:text-success border">Oui</ToggleGroupItem>
          <ToggleGroupItem value="no" className="h-7 text-xs data-[state=on]:bg-orange-500/10 data-[state=on]:border-orange-500 data-[state=on]:text-orange-600 border">Non</ToggleGroupItem>
          <ToggleGroupItem value="unknown" className="h-7 text-xs data-[state=on]:bg-muted data-[state=on]:border-border border">?</ToggleGroupItem>
        </ToggleGroup>
        {value && (
          <Badge className={cn("text-[10px] px-2 py-0", badgeFor(value))} variant="outline">
            {value === "yes" ? "Oui" : value === "no" ? "Non" : "Inconnu"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

