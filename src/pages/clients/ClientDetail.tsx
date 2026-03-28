import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { formatDistanceToNow, format, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft, Plus, MoreHorizontal, Mail, Phone, Hash,
  MapPin, FolderKanban, Flame, Calendar, Building2, Home, Store, FileText
} from "lucide-react";
import { toast } from "sonner";

import { useClientDetail, ClientProperty } from "@/hooks/useClientDetail";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";



const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manuel", phone: "Téléphone", web_form: "Formulaire web",
  showroom: "Showroom", fair: "Salon", referral: "Recommandation",
  partner: "Partenaire", import_csv: "Import",
};

const PROPERTY_TYPE_LABELS: Record<string, { label: string; icon: typeof Home }> = {
  house: { label: "Maison", icon: Home },
  apartment: { label: "Appartement", icon: Building2 },
  commercial: { label: "Local commercial", icon: Store },
  other: { label: "Autre", icon: MapPin },
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "infos";

  const { customer, properties, projects, installations, loading, error, refetch } = useClientDetail(id);

  // Keep breadcrumb in sync with customer name
  useEffect(() => {
    const label = loading ? "..." : (customer?.name ?? "Client introuvable");
    window.history.replaceState(
      { ...window.history.state, breadcrumb: label },
      ""
    );
  }, [loading, customer?.name]);

  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/clients");
  };

  const handleArchive = async () => {
    if (!id) return;
    const { error: err } = await coreDb.from("customers").update({ status: "archived" }).eq("id", id);
    if (err) { toast.error("Erreur : " + err.message); return; }
    toast.success("Client archivé");
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-muted-foreground">Client introuvable</p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
        </Button>
      </div>
    );
  }

  const isArchived = customer.status === "archived";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Archived banner */}
      {isArchived && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Ce client est archivé — les nouvelles actions sont désactivées.
        </div>
      )}

      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Clients
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <CustomerBadge customerType={customer.customer_type} />
            <StatusBadge status={customer.status} type="customer_status" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate(`/projects/new?customer=${id}`)}
              disabled={isArchived}
              title={isArchived ? "Client archivé" : undefined}
            >
              <Plus className="h-4 w-4 mr-1" /> Nouveau projet
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  Modifier
                  <span className="ml-auto text-xs text-muted-foreground">Bientôt</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(`/service-requests/new?customer=${id}`)}
                  disabled={isArchived}
                >
                  Nouvelle demande SAV
                </DropdownMenuItem>
                {!isArchived && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                        Archiver
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le client sera marqué comme archivé. Cette action est réversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleArchive}
                        >
                          Archiver
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="infos">Informations</TabsTrigger>
          <TabsTrigger value="projets">Projets {projects.length > 0 && `(${projects.length})`}</TabsTrigger>
          <TabsTrigger value="installations">Installations {installations.length > 0 && `(${installations.length})`}</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* ── Informations ── */}
        <TabsContent value="infos" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <Mail className="h-4 w-4" /> {customer.email}
                  </a>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs italic">Non renseigné</span>
                  </div>
                )}
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <Phone className="h-4 w-4" /> {customer.phone}
                  </a>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs italic">Non renseigné</span>
                  </div>
                )}
                {customer.siret && customer.customer_type !== "particulier" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" /> <span className="font-mono">{customer.siret}</span>
                  </div>
                )}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origine</span>
                    <span>{ORIGIN_LABELS[customer.source_origin] ?? customer.source_origin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client depuis</span>
                    <span>{format(new Date(customer.created_at), "d MMMM yyyy", { locale: fr })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Adresses d'intervention</CardTitle>
                <AddAddressSheet customerId={id!} onSuccess={refetch} />
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune adresse enregistrée.</p>
                ) : (
                  <div className="space-y-3">
                    {properties.map((p) => {
                      const pt = PROPERTY_TYPE_LABELS[p.property_type ?? "other"] ?? PROPERTY_TYPE_LABELS.other;
                      const Icon = pt.icon;
                      return (
                        <div key={p.id} className="flex items-start gap-3 text-sm">
                          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div>
                            <p>{p.address_line1}</p>
                            {p.address_line2 && <p className="text-muted-foreground">{p.address_line2}</p>}
                            <p className="text-muted-foreground">{p.postal_code} {p.city}</p>
                            <span className="text-xs text-muted-foreground">{pt.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Projets ── */}
        <TabsContent value="projets" className="mt-4 space-y-4">
          <Button size="sm" onClick={() => navigate(`/projects/new?customer=${id}`)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau projet
          </Button>
          {projects.length === 0 ? (
            <Card className="p-8 text-center">
              <FolderKanban className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun projet pour ce client.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm font-mono">{p.project_number}</span>
                      <StatusBadge status={p.status} type="project" size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(p.modified_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Installations ── */}
        <TabsContent value="installations" className="mt-4">
          {installations.length === 0 ? (
            <Card className="p-8 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune installation pour ce client.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {installations.map((inst) => {
                const sweepOverdue = inst.next_sweep_date && isPast(parseISO(inst.next_sweep_date));
                return (
                  <Card
                    key={inst.id}
                    className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
                    onClick={() => navigate(`/installations/${inst.id}`)}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Flame className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{inst.appliance_label}</span>
                        <StatusBadge status={inst.installation_status} type="installation" size="sm" />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {inst.next_sweep_date ? (
                          sweepOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                              <Calendar className="h-3 w-3" /> Ramonage en retard
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Prochain ramonage : {format(parseISO(inst.next_sweep_date), "d MMM yyyy", { locale: fr })}
                            </span>
                          )
                        ) : (
                          <span>Pas de ramonage planifié</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Les documents générés apparaîtront ici.</p>
            <p className="text-xs mt-1 opacity-70">Devis et factures PDF après génération.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Add Address Sheet ─── */

function AddAddressSheet({ customerId, onSuccess }: { customerId: string; onSuccess: () => void }) {
  const { tenantId } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ address_line1: "", address_line2: "", postal_code: "", city: "", property_type: "house" });

  const handleSave = async () => {
    if (!form.address_line1.trim() || !form.postal_code.trim() || !form.city.trim()) {
      toast.error("Adresse, code postal et ville sont obligatoires.");
      return;
    }
    setSaving(true);
    const { error } = await coreDb.from("properties").insert({
      tenant_id: tenantId,
      customer_id: customerId,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      postal_code: form.postal_code.trim(),
      city: form.city.trim(),
      property_type: form.property_type,
    });
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Adresse ajoutée");
    setOpen(false);
    setForm({ address_line1: "", address_line2: "", postal_code: "", city: "", property_type: "house" });
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Adresse</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>Nouvelle adresse</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <label className="text-sm font-medium">Adresse *</label>
            <Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Complément</label>
            <Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Code postal *</label>
              <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Ville *</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="house">Maison</SelectItem>
                <SelectItem value="apartment">Appartement</SelectItem>
                <SelectItem value="commercial">Local commercial</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Enregistrement…" : "Ajouter l'adresse"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
