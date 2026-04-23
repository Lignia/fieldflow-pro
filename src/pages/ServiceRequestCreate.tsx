import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { coreDb, operationsDb, catalogDb } from "@/integrations/supabase/schema-clients";
import { toTitleCase } from "@/lib/format";

interface CustomerLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  name: string | null;
  phone: string | null;
}

interface InstallationLite {
  id: string;
  device_type: string | null;
  brand: string | null;
  model: string | null;
  status: string | null;
}

interface CatalogItemLite {
  id: string;
  name: string;
  brand: string | null;
  model_ref: string | null;
  device_category: string | null;
  fuel_type: string | null;
  power_kw: number | null;
  warranty_years_manufacturer: number | null;
  warranty_years_installer: number | null;
}

interface DeviceTypeOption {
  code: string;
  label: string;
  device_category: string | null;
  fuel_hint: string | null;
}

const CATEGORY_OPTIONS = [
  { value: "breakdown", label: "Panne" },
  { value: "sweep", label: "Ramonage" },
  { value: "annual_service", label: "Entretien annuel" },
  { value: "warranty_claim", label: "Garantie" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Autre" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
] as const;

const CHANNEL_OPTIONS = [
  { value: "phone", label: "Téléphone" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "web_form", label: "Formulaire web" },
  { value: "in_person", label: "En personne" },
  { value: "app", label: "Application" },
] as const;

const CONTACT_EVENT_OPTIONS = [
  { value: "inbound_call", label: "Appel entrant" },
  { value: "outbound_call", label: "Appel sortant" },
  { value: "email_received", label: "Email reçu" },
  { value: "other", label: "Autre" },
] as const;

function customerDisplay(c: CustomerLite): string {
  if (c.company_name) return toTitleCase(c.company_name);
  const parts = [c.first_name, c.last_name].filter(Boolean).join(" ");
  if (parts) return toTitleCase(parts);
  return c.name ? toTitleCase(c.name) : "Client";
}

export default function ServiceRequestCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useCurrentUser();

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerLite[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLite | null>(null);

  // Installations
  const [installations, setInstallations] = useState<InstallationLite[]>([]);
  const [installationId, setInstallationId] = useState<string>("none");

  // New install (when customer has no installations)
  const [newInstallMode, setNewInstallMode] = useState<"later" | "describe">("later");
  const [deviceTypes, setDeviceTypes] = useState<DeviceTypeOption[]>([]);
  const [deviceTypeCode, setDeviceTypeCode] = useState<string>("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogDebounced, setCatalogDebounced] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogItemLite[]>([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItemLite | null>(null);
  const [deviceType, setDeviceType] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [devicePower, setDevicePower] = useState("");
  const [deviceCategory, setDeviceCategory] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<string | null>(null);

  // Form
  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [channel, setChannel] = useState<string>("phone");
  const [notes, setNotes] = useState("");

  // First contact
  const [contactEnabled, setContactEnabled] = useState(false);
  const [eventType, setEventType] = useState<string>("inbound_call");
  const [duration, setDuration] = useState<string>("");
  const [body, setBody] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(customerSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // Run search
  useEffect(() => {
    if (selectedCustomer || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      const term = `%${debounced}%`;
      const { data, error } = await coreDb
        .from("customers")
        .select("id, first_name, last_name, company_name, name, phone")
        .or(
          `last_name.ilike.${term},company_name.ilike.${term},first_name.ilike.${term},name.ilike.${term}`,
        )
        .limit(10);
      if (cancelled) return;
      if (error) {
        toast({
          title: "Erreur de recherche",
          description: error.message,
          variant: "destructive",
        });
        setResults([]);
      } else {
        setResults((data ?? []) as CustomerLite[]);
      }
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, selectedCustomer, toast]);

  // Fetch installations of selected customer
  useEffect(() => {
    if (!selectedCustomer) {
      setInstallations([]);
      setInstallationId("none");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await coreDb
        .from("installations")
        .select("id, device_type, brand, model, status")
        .eq("customer_id", selectedCustomer.id);
      if (cancelled) return;
      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        setInstallations([]);
      } else {
        setInstallations((data ?? []) as InstallationLite[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCustomer, toast]);

  // Load device types catalog (once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await catalogDb
        .from("device_types")
        .select("code, label, device_category, fuel_hint")
        .eq("is_active", true)
        .order("sort_order");
      if (cancelled) return;
      setDeviceTypes((data ?? []) as DeviceTypeOption[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounce catalog search
  useEffect(() => {
    const t = setTimeout(() => setCatalogDebounced(catalogSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [catalogSearch]);

  // Run catalog search
  useEffect(() => {
    if (selectedCatalogItem || catalogDebounced.length < 2) {
      setCatalogResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setCatalogSearching(true);
      const { data } = await catalogDb
        .from("catalog_items")
        .select("id, name, brand, model_ref, device_category, fuel_type, power_kw, warranty_years_manufacturer, warranty_years_installer")
        .eq("is_active", true)
        .ilike("name", `%${catalogDebounced}%`)
        .limit(8);
      if (cancelled) return;
      setCatalogResults((data ?? []) as CatalogItemLite[]);
      setCatalogSearching(false);
    })();
    return () => { cancelled = true; };
  }, [catalogDebounced, selectedCatalogItem]);

  function applyCatalogItem(item: CatalogItemLite) {
    setSelectedCatalogItem(item);
    setCatalogResults([]);
    setCatalogSearch("");
    setDeviceType(item.name || "");
    setDeviceBrand(item.brand || "");
    setDeviceModel(item.model_ref || "");
    setDevicePower(item.power_kw != null ? String(item.power_kw) : "");
    setDeviceCategory(item.device_category || null);
    setFuelType(item.fuel_type || null);
  }

  function clearCatalogItem() {
    setSelectedCatalogItem(null);
  }

  function handleDeviceTypeChange(code: string) {
    setDeviceTypeCode(code);
    if (code === "other") {
      setDeviceCategory(null);
      setFuelType(null);
      return;
    }
    const opt = deviceTypes.find((d) => d.code === code);
    if (opt) {
      setDeviceType(opt.label);
      setDeviceCategory(opt.device_category);
      setFuelType(opt.fuel_hint);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!selectedCustomer) e.customer = "Sélectionnez un client.";
    if (!category) e.category = "Choisissez une catégorie.";
    if (!notes.trim()) e.notes = "Décrivez le problème signalé.";
    if (contactEnabled && !body.trim()) e.body = "Ajoutez les notes de l'échange.";
    // If customer has no installations and chose "describe", device_type is required
    if (
      selectedCustomer &&
      installations.length === 0 &&
      newInstallMode === "describe" &&
      !deviceType.trim()
    ) {
      e.deviceType = "Renseignez le type d'appareil.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (!tenantId) {
      toast({
        title: "Session non chargée",
        description: "Patientez avant de soumettre.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    const categoryLabel =
      CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;

    // Step 1 (optional): create installation in "describe" mode
    let createdInstallationId: string | null = null;
    if (
      installations.length === 0 &&
      newInstallMode === "describe" &&
      deviceType.trim()
    ) {
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);

      const addYears = (years: number) => {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() + years);
        return d.toISOString().slice(0, 10);
      };

      const installPayload: Record<string, unknown> = {
        tenant_id: tenantId,
        customer_id: selectedCustomer!.id,
        device_type: deviceType.trim(),
        brand: deviceBrand.trim() || null,
        model: deviceModel.trim() || null,
        serial_number: deviceSerial.trim() || null,
        device_category: deviceCategory,
        fuel_type: fuelType,
        installed_by_self: false,
        takeover_date: todayIso,
        status: "draft",
        origin: "manual_import",
      };

      if (selectedCatalogItem) {
        installPayload.catalog_item_id = selectedCatalogItem.id;
        if (selectedCatalogItem.warranty_years_manufacturer) {
          installPayload.manufacturer_warranty_start = todayIso;
          installPayload.manufacturer_warranty_end = addYears(
            selectedCatalogItem.warranty_years_manufacturer,
          );
        }
        if (selectedCatalogItem.warranty_years_installer) {
          installPayload.service_warranty_start = todayIso;
          installPayload.service_warranty_end = addYears(
            selectedCatalogItem.warranty_years_installer,
          );
        }
      }

      const { data: inst, error: instErr } = await coreDb
        .from("installations")
        .insert(installPayload)
        .select("id")
        .single();

      if (instErr || !inst) {
        toast({
          title: "Création installation impossible",
          description: instErr?.message ?? "Erreur inconnue",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      createdInstallationId = inst.id;
    }

    const finalInstallationId =
      createdInstallationId ??
      (installationId !== "none" ? installationId : null);

    const insertPayload = {
      tenant_id: tenantId,
      customer_id: selectedCustomer!.id,
      installation_id: finalInstallationId,
      request_type: categoryLabel,
      request_category: category,
      priority,
      channel,
      notes: notes.trim(),
      status: "new",
      first_contact_at: new Date().toISOString(),
    };

    const { data: created, error: insertErr } = await operationsDb
      .from("service_requests")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr || !created) {
      toast({
        title: "Création impossible",
        description: insertErr?.message ?? "Erreur inconnue",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    if (contactEnabled) {
      const isCall = eventType.endsWith("_call");
      const evtPayload = {
        tenant_id: tenantId,
        service_request_id: created.id,
        customer_id: selectedCustomer!.id,
        event_type: eventType,
        duration_seconds: isCall && duration ? Number(duration) : null,
        body: body.trim() || null,
        occurred_at: new Date().toISOString(),
      };
      const { error: evtErr } = await operationsDb
        .from("contact_events")
        .insert(evtPayload);
      if (evtErr) {
        toast({
          title: "Demande créée, contact non enregistré",
          description: evtErr.message,
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Demande SAV créée",
      description: "Vous accédez à la fiche.",
    });
    navigate(`/service-requests/${created.id}`);
  }

  const isCallEvent = eventType.endsWith("_call");

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/service-requests")}
        >
          <ArrowLeft className="h-4 w-4" />
          Demandes SAV
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Nouvelle demande SAV
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enregistrez une demande client pour assurer son suivi.
        </p>
      </div>

      <Card className="p-5 space-y-5">
        {/* Customer */}
        <div className="space-y-2">
          <Label>Client <span className="text-destructive">*</span></Label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">
                  {customerDisplay(selectedCustomer)}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Rechercher un client par nom ou société…"
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {results.length > 0 && (
                <div className="mt-1 rounded-md border bg-popover shadow-md overflow-hidden">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setResults([]);
                        setCustomerSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                    >
                      <div className="font-medium">{customerDisplay(c)}</div>
                      {c.phone && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {c.phone}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.customer && (
            <p className="text-xs text-destructive">{errors.customer}</p>
          )}
        </div>

        {/* Installation */}
        {selectedCustomer && (
          <div className="space-y-2">
            <Label>Installation liée</Label>
            {installations.length > 0 ? (
              <Select value={installationId} onValueChange={setInstallationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune installation spécifique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune installation spécifique</SelectItem>
                  {installations.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {[i.device_type, i.brand, i.model].filter(Boolean).join(" • ") ||
                        "Installation"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <RadioGroup
                  value={newInstallMode}
                  onValueChange={(v) => setNewInstallMode(v as "later" | "describe")}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="later" id="mode-later" className="mt-0.5" />
                    <Label htmlFor="mode-later" className="font-normal cursor-pointer flex-1">
                      <div className="text-sm font-medium">Identifier plus tard</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        L'appareil sera identifié lors de l'intervention.
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="describe" id="mode-describe" className="mt-0.5" />
                    <Label htmlFor="mode-describe" className="font-normal cursor-pointer flex-1">
                      <div className="text-sm font-medium">Décrire l'appareil maintenant</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Crée une installation "reprise" liée à cette demande.
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {newInstallMode === "describe" && (
                  <div className="rounded-md border bg-muted/30 p-4 space-y-4">
                    {/* Catalog search */}
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Article catalogue (optionnel)
                      </Label>
                      {selectedCatalogItem ? (
                        <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {selectedCatalogItem.name}
                              </p>
                              <Badge variant="secondary" className="mt-0.5 text-xs">
                                Depuis le catalogue
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={clearCatalogItem}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            placeholder="Rechercher un article du catalogue…"
                            className="pl-9"
                          />
                          {catalogSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {catalogResults.length > 0 && (
                            <div className="mt-1 rounded-md border bg-popover shadow-md overflow-hidden">
                              {catalogResults.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => applyCatalogItem(item)}
                                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                                >
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {[item.brand, item.model_ref, item.power_kw && `${item.power_kw} kW`]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Device type select */}
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Type d'appareil <span className="text-destructive">*</span>
                      </Label>
                      <Select value={deviceTypeCode} onValueChange={handleDeviceTypeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un type d'appareil" />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceTypes.map((d) => (
                            <SelectItem key={d.code} value={d.code}>
                              {d.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      {(deviceTypeCode === "other" || !deviceTypeCode) && (
                        <Input
                          value={deviceType}
                          onChange={(e) => setDeviceType(e.target.value)}
                          placeholder="ex: Poêle à bois, Insert, Chaudière…"
                        />
                      )}
                      {errors.deviceType && (
                        <p className="text-xs text-destructive">{errors.deviceType}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Marque</Label>
                        <Input
                          value={deviceBrand}
                          onChange={(e) => setDeviceBrand(e.target.value)}
                          placeholder="ex: Jotul"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Modèle</Label>
                        <Input
                          value={deviceModel}
                          onChange={(e) => setDeviceModel(e.target.value)}
                          placeholder="ex: F 305"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Numéro de série</Label>
                        <Input
                          value={deviceSerial}
                          onChange={(e) => setDeviceSerial(e.target.value)}
                          placeholder="optionnel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Puissance (kW)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={devicePower}
                          onChange={(e) => setDevicePower(e.target.value)}
                          placeholder="ex: 8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <Label>Catégorie <span className="text-destructive">*</span></Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category}</p>
          )}
        </div>

        {/* Priority + Channel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Canal d'entrée</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Description du problème <span className="text-destructive">*</span></Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Décrivez le problème signalé par le client…"
            rows={4}
            maxLength={2000}
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes}</p>
          )}
        </div>
      </Card>

      {/* First contact */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">
              Enregistrer le premier contact
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tracez l'échange initial avec le client.
            </p>
          </div>
          <Switch checked={contactEnabled} onCheckedChange={setContactEnabled} />
        </div>

        {contactEnabled && (
          <div className="space-y-4 pt-2 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type d'événement</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_EVENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isCallEvent && (
                <div className="space-y-2">
                  <Label>Durée (secondes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="180"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes de l'échange</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Résumé de l'échange…"
                rows={3}
                maxLength={2000}
              />
              {errors.body && (
                <p className="text-xs text-destructive">{errors.body}</p>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate("/service-requests")}
          disabled={submitting}
        >
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !tenantId}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer la demande
        </Button>
      </div>
    </div>
  );
}
