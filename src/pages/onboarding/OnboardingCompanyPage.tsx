import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingLayout } from "@/components/auth/OnboardingLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSiretSearch, isBatimentApe, type CompanyResult } from "@/hooks/useSiretSearch";
import { Search, Building2, MapPin, Hash, Scale, Star, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

type Phase = "search" | "confirm" | "error_provisioned";

export default function OnboardingCompanyPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("search");
  const [company, setCompany] = useState<CompanyResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSiret, setManualSiret] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPostal, setManualPostal] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { results, loading: searching, apeWarning, search, lookupSiret, checkApe, setResults } =
    useSiretSearch();

  const selectCompany = (result: CompanyResult) => {
    setCompany(result);
    checkApe(result.activite_principale);
    setResults([]);
    setPhase("confirm");
  };

  const handleManualLookup = async () => {
    if (!/^\d{14}$/.test(manualSiret)) return;
    const result = await lookupSiret(manualSiret);
    if (result) {
      selectCompany(result);
    } else {
      // Build manual company with user-provided data
      setCompany({
        nom_complet: manualName,
        siret: manualSiret,
        siren: manualSiret.slice(0, 9),
        adresse: "",
        ville: manualCity,
        code_postal: manualPostal,
        nature_juridique: "",
        activite_principale: "",
        staff_range: "",
        company_created_at: "",
      });
      setPhase("confirm");
    }
  };

  const handleManualSubmit = () => {
    if (!manualName.trim() || !/^\d{14}$/.test(manualSiret) || !manualPostal.trim() || !manualCity.trim()) return;
    setCompany({
      nom_complet: manualName.trim(),
      siret: manualSiret,
      siren: manualSiret.slice(0, 9),
      adresse: "",
      ville: manualCity.trim(),
      code_postal: manualPostal.trim(),
      nature_juridique: "",
      activite_principale: "",
      staff_range: "",
      company_created_at: "",
    });
    setPhase("confirm");
  };

  const handleProvision = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("provision-tenant", {
        body: {
          company_name: company.nom_complet,
          siret: company.siret,
          siren: company.siren,
          address_line: company.adresse,
          city: company.ville,
          postal_code: company.code_postal,
          ape_code: company.activite_principale,
          legal_form: company.nature_juridique,
          staff_range: company.staff_range,
          company_created_at: company.company_created_at,
        },
      });

      if (error) {
        console.error("provision-tenant network error:", error);
        toast.error("Erreur de communication avec le serveur");
        return;
      }

      if (data?.error) {
        if (data.error === "already_provisioned") {
          setPhase("error_provisioned");
          return;
        }
        if (data.error === "unauthorized") {
          toast.error("Session expirée, veuillez vous reconnecter");
          navigate("/auth/login");
          return;
        }
        console.error("provision-tenant error:", data);
        toast.error(data.message || "Erreur inattendue");
        return;
      }

      // Refresh JWT to get tenant_id claim
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        toast.error("Session expirée, veuillez vous reconnecter");
        navigate("/auth/login");
        return;
      }

      navigate("/onboarding/profile");
    } catch (err) {
      console.error("provision-tenant exception:", err);
      toast.error("Erreur inattendue, veuillez réessayer");
    } finally {
      setLoading(false);
    }
  };

  // ─── Already provisioned error ───
  if (phase === "error_provisioned") {
    return (
      <OnboardingLayout currentStep={1}>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <CardTitle className="text-xl">SIRET déjà enregistré</CardTitle>
            <CardDescription>
              Ce SIRET est déjà enregistré sur LIGNIA. Si vous êtes collaborateur de cette entreprise,
              demandez une invitation à votre administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/auth/login")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </OnboardingLayout>
    );
  }

  // ─── Confirmation ───
  if (phase === "confirm" && company) {
    return (
      <OnboardingLayout currentStep={1}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{company.nom_complet || "Votre entreprise"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">SIRET</p>
                  <p className="text-sm font-mono">
                    {company.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}
                  </p>
                </div>
              </div>

              {(company.adresse || company.ville) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Adresse</p>
                    <p className="text-sm">
                      {[company.adresse, company.code_postal, company.ville].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {company.activite_principale && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Activité</p>
                    <p className="text-sm">{company.activite_principale}</p>
                  </div>
                </div>
              )}

              {company.nature_juridique && (
                <div className="flex items-start gap-3">
                  <Scale className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Forme juridique</p>
                    <p className="text-sm">{company.nature_juridique}</p>
                  </div>
                </div>
              )}
            </div>

            {apeWarning && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="text-sm text-warning">{apeWarning}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPhase("search");
                  setCompany(null);
                }}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Rechercher une autre entreprise
              </Button>
              <SubmitButton
                loading={loading}
                className="flex-1"
                onClick={handleProvision}
              >
                C'est mon entreprise
                <ArrowRight className="ml-2 h-4 w-4" />
              </SubmitButton>
            </div>
          </CardContent>
        </Card>
      </OnboardingLayout>
    );
  }

  // ─── Search ───
  return (
    <OnboardingLayout currentStep={1}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Trouvons votre entreprise</CardTitle>
          <CardDescription>Pour personnaliser votre espace LIGNIA</CardDescription>
        </CardHeader>
        <CardContent>
          {!manualMode ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ex : Chauffage Dupont, Plomberie Martin..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    search(e.target.value);
                  }}
                  autoFocus
                  type="search"
                />
              </div>

              {searching && (
                <p className="text-sm text-muted-foreground animate-pulse">Recherche en cours…</p>
              )}

              {results.length > 0 && (
                <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                      onClick={() => selectCompany(r)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm flex-1">{r.nom_complet}</p>
                        {isBatimentApe(r.activite_principale) && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Star className="h-3 w-3" />
                            Bâtiment
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {r.siret}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[r.adresse, r.ville].filter(Boolean).join(" — ")}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 3 && !searching && results.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-2 py-2">
                  <p>Entreprise introuvable ?</p>
                  <p>Saisissez votre SIRET directement (14 chiffres)</p>
                </div>
              )}

              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary underline"
                onClick={() => setManualMode(true)}
              >
                Saisir mon SIRET manuellement
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-name">Nom de l'entreprise *</Label>
                <Input
                  id="manual-name"
                  placeholder="Ex : Chauffage Dupont"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-siret">SIRET * (14 chiffres)</Label>
                <Input
                  id="manual-siret"
                  placeholder="12345678901234"
                  value={manualSiret}
                  onChange={(e) =>
                    setManualSiret(e.target.value.replace(/\D/g, "").slice(0, 14))
                  }
                  inputMode="numeric"
                  maxLength={14}
                  className="font-mono"
                />
                {manualSiret.length > 0 && manualSiret.length < 14 && (
                  <p className="text-xs text-muted-foreground">
                    {14 - manualSiret.length} chiffres restants
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="manual-postal">Code postal *</Label>
                  <Input
                    id="manual-postal"
                    placeholder="69003"
                    value={manualPostal}
                    onChange={(e) => setManualPostal(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-city">Ville *</Label>
                  <Input
                    id="manual-city"
                    placeholder="Lyon"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setManualMode(false);
                    setManualSiret("");
                    setManualName("");
                    setManualPostal("");
                    setManualCity("");
                  }}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Recherche par nom
                </Button>
                <Button
                  type="button"
                  onClick={manualName.trim() ? handleManualSubmit : handleManualLookup}
                  disabled={
                    manualSiret.length !== 14 ||
                    (manualName.trim()
                      ? !manualPostal.trim() || !manualCity.trim()
                      : searching)
                  }
                  className="flex-1"
                >
                  {searching ? "Recherche…" : "Valider"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
