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
import { Search, Building2, MapPin, Hash, Scale, Star, ArrowLeft, ArrowRight, AlertTriangle, User, Award } from "lucide-react";

type Phase = "search" | "confirm" | "error_provisioned";

const LEGAL_FORMS: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "5499": "SARL",
  "5710": "SAS",
  "5720": "SASU",
  "5308": "EURL",
};

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const formatSiret = (siret: string) => {
  const clean = siret.replace(/\D/g, "");
  if (clean.length !== 14) return siret || "Non disponible";
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4");
};

export default function OnboardingCompanyPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("search");
  const [company, setCompany] = useState<CompanyResult | null>(null);
  const [resolvedSiret, setResolvedSiret] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualSiret, setManualSiret] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPostal, setManualPostal] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { results, loading: searching, apeWarning, search, lookupSiret, checkApe, setResults } =
    useSiretSearch();

  const cleanSiret = (siret: string) => siret.replace(/\s/g, "").replace(/\D/g, "");

  const resolveSiret = async (comp: CompanyResult): Promise<string> => {
    let raw = comp.siret ?? "";
    let cleaned = cleanSiret(raw);

    if (cleaned.length !== 14 && comp.siren) {
      try {
        const res = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search` +
            `?q=${encodeURIComponent(comp.siren)}` +
            `&per_page=1&etat_administratif=A` +
            `&minimal=true&include=siege`,
          { headers: { "User-Agent": "LIGNIA-onboarding/1.0" } }
        );
        const data = await res.json();
        const fallback = data.results?.[0]?.siege?.siret;
        if (fallback) cleaned = cleanSiret(fallback);
      } catch (e) {
        console.error("Erreur récupération SIRET via SIREN", e);
      }
    }

    return cleaned;
  };

  const selectCompany = async (result: CompanyResult) => {
    setCompany(result);
    checkApe(result.activite_principale);
    setResults([]);
    const siret = await resolveSiret(result);
    setResolvedSiret(siret);
    setPhase("confirm");
  };

  const handleManualLookup = async () => {
    if (!/^\d{14}$/.test(manualSiret)) return;
    const result = await lookupSiret(manualSiret);
    if (result) {
      selectCompany(result);
    } else {
      const manualCompany: CompanyResult = {
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
      };
      setCompany(manualCompany);
      setResolvedSiret(manualSiret);
      setPhase("confirm");
    }
  };

  const handleManualSubmit = () => {
    if (!manualName.trim() || !/^\d{14}$/.test(manualSiret) || !manualPostal.trim() || !manualCity.trim()) return;
    const manualCompany: CompanyResult = {
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
    };
    setCompany(manualCompany);
    setResolvedSiret(manualSiret);
    setPhase("confirm");
  };

  const handleProvision = async () => {
    if (!company) return;

    const siret = resolvedSiret;
    if (siret.length !== 14) {
      toast.error("SIRET introuvable pour cette entreprise. Veuillez le saisir manuellement.");
      setPhase("search");
      return;
    }

    setLoading(true);
    try {
      // Resolve full_name with cascade fallback
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      const tempFullName =
        user?.user_metadata?.full_name
        ?? user?.user_metadata?.name
        ?? user?.email?.split("@")[0]
        ?? "Utilisateur";

      const { data, error } = await supabase.functions.invoke("provision-tenant", {
        body: JSON.stringify({
          company_name: company.nom_complet,
          siret,
          siren: company.siren,
          address_line: company.adresse,
          city: company.ville,
          postal_code: company.code_postal,
          ape_code: company.activite_principale,
          legal_form: company.nature_juridique,
          staff_range: company.staff_range,
          company_created_at: company.company_created_at,
          full_name: tempFullName,
        }),
        headers: { "Content-Type": "application/json" },
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
    const dirigeant = company.dirigeants?.find(
      (d) => d.type_dirigeant === "personne physique"
    );
    const legalLabel = LEGAL_FORMS[company.nature_juridique] || company.nature_juridique;
    const certifications: { label: string; title?: string; variant: "default" | "secondary"; prominent?: boolean }[] = [];

    if (company.complements?.est_rge) {
      certifications.push({ label: "✓ Certifié RGE", title: "Reconnu Garant de l'Environnement", variant: "default", prominent: true });
    }
    if (company.complements?.est_qualiopi) {
      certifications.push({ label: "✓ Qualiopi", variant: "default" });
    }
    if (company.complements?.est_patrimoine_vivant) {
      certifications.push({ label: "Entreprise du Patrimoine Vivant", variant: "secondary" });
    }

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
                    {formatSiret(resolvedSiret)}
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

              {dirigeant && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dirigeant</p>
                    <p className="text-sm">
                      {toTitleCase(dirigeant.prenoms)} {toTitleCase(dirigeant.nom)}
                      {dirigeant.qualite && ` — ${dirigeant.qualite}`}
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

              {legalLabel && (
                <div className="flex items-start gap-3">
                  <Scale className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Forme juridique</p>
                    <p className="text-sm">{legalLabel}</p>
                  </div>
                </div>
              )}

              {certifications.length > 0 && (
                <div className="flex items-start gap-3">
                  <Award className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Certifications</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {certifications.map((cert, i) => (
                        <Badge
                          key={i}
                          variant={cert.variant}
                          title={cert.title}
                          className={cert.prominent ? "text-xs px-2.5 py-1" : "text-xs"}
                        >
                          {cert.label}
                        </Badge>
                      ))}
                    </div>
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
                  setResolvedSiret("");
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
