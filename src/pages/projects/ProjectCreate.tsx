import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Plus, Home, Building2, Store, MapPin, Check } from "lucide-react";
import { toast } from "sonner";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCustomerSearch, type CustomerSearchResult } from "@/hooks/useCustomerSearch";
import { useCustomerProperties, type Property } from "@/hooks/useCustomerProperties";
import { CustomerBadge } from "@/components/CustomerBadge";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ORIGINS = [
  { value: "manual", label: "Manuel" },
  { value: "phone", label: "Téléphone" },
  { value: "web_form", label: "Site web" },
  { value: "showroom", label: "Showroom" },
  { value: "fair", label: "Salon / Foire" },
  { value: "referral", label: "Recommandation" },
  { value: "partner", label: "Partenaire" },
] as const;

const PROPERTY_TYPE_LABELS: Record<Property["property_type"], string> = {
  house: "Maison", apartment: "Appartement", commercial: "Local commercial", other: "Autre",
};
const PROPERTY_TYPE_ICONS: Record<Property["property_type"], React.ReactNode> = {
  house: <Home className="h-4 w-4" />, apartment: <Building2 className="h-4 w-4" />,
  commercial: <Store className="h-4 w-4" />, other: <MapPin className="h-4 w-4" />,
};

export default function ProjectCreate() {
  const navigate = useNavigate();

  // --- Customer search ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const { results: customerResults, loading: searchLoading } = useCustomerSearch(searchTerm);

  // --- Properties ---
  const { properties, loading: propsLoading, refetch: refetchProps } = useCustomerProperties(selectedCustomer?.id ?? null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ address_line1: "", address_line2: "", postal_code: "", city: "", property_type: "house" as Property["property_type"] });
  const [creatingAddr, setCreatingAddr] = useState(false);

  // --- Project info ---
  const [origin, setOrigin] = useState("");
  const [notes, setNotes] = useState("");

  // --- Submission ---
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ customer?: string; property?: string; origin?: string }>({});

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
  };

  // --- Create inline address ---
  const handleCreateAddress = async () => {
    if (!selectedCustomer || !newAddr.address_line1 || !newAddr.postal_code || !newAddr.city) return;
    setCreatingAddr(true);

    if (import.meta.env.VITE_DEV_BYPASS_AUTH === "true") {
      const fakeId = `mock-new-${Date.now()}`;
      toast.success("Adresse ajoutée (mode DEV)");
      setSelectedPropertyId(fakeId);
      setShowNewAddress(false);
      setNewAddr({ address_line1: "", address_line2: "", postal_code: "", city: "", property_type: "house" });
      setCreatingAddr(false);
      return;
    }

    try {
      const { data, error } = await (coreDb as any)
        .from("properties")
        .insert({
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

  // --- Submit project ---
  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    if (!selectedCustomer) newErrors.customer = "Veuillez sélectionner un client.";
    if (!selectedPropertyId) newErrors.property = "Veuillez sélectionner une adresse.";
    if (!origin) newErrors.origin = "Veuillez sélectionner l'origine du contact.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);

    if (import.meta.env.VITE_DEV_BYPASS_AUTH === "true") {
      toast.success("Projet PRJ-0099 créé (mode DEV)");
      navigate("/projects/mock-project-1");
      return;
    }

    try {
      const { data, error } = await (coreDb as any)
        .from("projects")
        .insert({
          customer_id: selectedCustomer!.id,
          property_id: selectedPropertyId,
          status: "lead_new",
          workstream: "project_installation",
          origin,
          payload: { notes: notes || "" },
        })
        .select("id, project_number")
        .single();

      if (error) throw error;
      toast.success(`Projet ${data.project_number} créé`);
      navigate(`/projects/${data.id}`);
    } catch (e: any) {
      toast.error("Erreur lors de la création du projet", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[680px] px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" /> Projets
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nouveau projet</h1>
        </div>

        {/* SECTION 1 — Client */}
        <section className="space-y-3">
          <Label className="text-base font-semibold">Client</Label>

          {selectedCustomer ? (
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
                <Button variant="ghost" size="icon" onClick={clearCustomer} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
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
          </section>
        )}

        {/* SECTION 3 — Infos projet */}
        <section className="space-y-3">
          <Label className="text-base font-semibold">Informations projet</Label>

          <div className="space-y-1.5">
            <Label className="text-sm">Origine du contact</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger><SelectValue placeholder="Sélectionner l'origine…" /></SelectTrigger>
              <SelectContent>
                {ORIGINS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.origin && <p className="text-sm text-destructive">{errors.origin}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Première impression, besoin exprimé, type d'appareil envisagé..."
              rows={4}
            />
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end pt-2 pb-8">
          <Button
            size="lg"
            disabled={submitting}
            onClick={handleSubmit}
            className="min-w-[180px]"
          >
            {submitting ? "Création en cours…" : "Créer le projet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
