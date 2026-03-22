import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/AuthCard";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSiretSearch, type CompanyResult } from "@/hooks/useSiretSearch";
import { Search, ArrowRight, Building2, MapPin, Hash, Scale } from "lucide-react";

export default function OnboardingCompanyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [company, setCompany] = useState<CompanyResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSiret, setManualSiret] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const { results, loading: searching, apeWarning, search, lookupSiret, checkApe, setResults } =
    useSiretSearch();

  const selectCompany = (result: CompanyResult) => {
    setCompany(result);
    setCompanyName(result.nom_complet);
    checkApe(result.activite_principale);
    setResults([]);
    setStep(3);
  };

  const handleManualLookup = async () => {
    if (!/^\d{14}$/.test(manualSiret)) return;
    const result = await lookupSiret(manualSiret);
    if (result) {
      setCompany(result);
      setCompanyName(result.nom_complet);
      setStep(3);
    } else {
      setCompany({
        nom_complet: "",
        siret: manualSiret,
        adresse: "",
        nature_juridique: "",
        activite_principale: "",
        ville: "",
      });
      setCompanyName("");
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const finalName = companyName.trim() || company.nom_complet;
    if (!finalName) {
      toast.error("Veuillez saisir le nom de votre entreprise");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("provision-tenant", {
        body: {
          company_name: finalName,
          siret: company.siret,
          phone: undefined,
        },
      });

      if (error) {
        toast.error("Erreur de communication avec le serveur");
        return;
      }

      if (data?.error) {
        switch (data.error) {
          case "invalid_siret":
            toast.error(data.message || "SIRET invalide");
            setStep(2);
            break;
          case "invalid_company_name":
            toast.error(data.message || "Raison sociale invalide");
            setStep(2);
            break;
          case "already_provisioned": {
            const { error: refreshErr } = await supabase.auth.refreshSession();
            if (refreshErr) {
              toast.error("Session expirée, veuillez vous reconnecter");
              navigate("/auth/login");
              return;
            }
            navigate("/dashboard");
            break;
          }
          case "unauthorized":
            toast.error("Session expirée, veuillez vous reconnecter");
            navigate("/auth/login");
            break;
          default:
            toast.error(data.message || "Erreur inattendue");
        }
        return;
      }

      // Succès — refresh obligatoire pour injecter tenant_id dans le JWT
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        toast.error("Session expirée, veuillez vous reconnecter");
        navigate("/auth/login");
        return;
      }
      navigate("/dashboard");
    } catch {
      toast.error("Erreur inattendue, veuillez réessayer");
    } finally {
      setLoading(false);
    }
  };

  // ─── Étape 1 : Bienvenue ───
  if (step === 1) {
    return (
      <AuthCard
        title="Bienvenue sur LIGNIA"
        description="Configurons votre espace en 30 secondes"
      >
        <Button onClick={() => setStep(2)} className="w-full" size="lg">
          C'est parti
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AuthCard>
    );
  }

  // ─── Étape 2 : Recherche entreprise ───
  if (step === 2) {
    return (
      <AuthCard
        title="Quel est le nom de votre entreprise ?"
        description="Recherchez votre entreprise pour pré-remplir vos informations"
      >
        {!manualMode ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex : Chaleur Bois, Fumisterie Martin..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  search(e.target.value);
                }}
                autoFocus
              />
            </div>

            {searching && (
              <p className="text-sm text-muted-foreground">Recherche en cours…</p>
            )}

            {results.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                    onClick={() => selectCompany(r)}
                  >
                    <p className="font-medium text-sm">{r.nom_complet}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.siret} — {r.ville}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun résultat. Essayez avec votre numéro SIRET.
              </p>
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
              <Label htmlFor="siret">SIRET (14 chiffres)</Label>
              <Input
                id="siret"
                placeholder="12345678901234"
                value={manualSiret}
                onChange={(e) =>
                  setManualSiret(e.target.value.replace(/\D/g, "").slice(0, 14))
                }
                inputMode="numeric"
                maxLength={14}
                autoFocus
              />
            </div>
            <Button
              type="button"
              onClick={handleManualLookup}
              disabled={manualSiret.length !== 14 || searching}
              className="w-full"
            >
              {searching ? "Recherche…" : "Valider"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary underline"
              onClick={() => {
                setManualMode(false);
                setManualSiret("");
              }}
            >
              Revenir à la recherche par nom
            </button>
          </div>
        )}
      </AuthCard>
    );
  }

  // ─── Étape 3 : Confirmation ───
  return (
    <AuthCard
      title="Confirmez vos informations"
      description="Vérifiez que tout est correct avant de créer votre espace"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
          {company?.nom_complet ? (
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Entreprise</p>
                <p className="text-sm font-medium">{company.nom_complet}</p>
              </div>
            </div>
          ) : null}

          {company?.adresse && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Adresse</p>
                <p className="text-sm">{company.adresse}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Hash className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">SIRET</p>
              <p className="text-sm font-mono">{company?.siret}</p>
            </div>
          </div>

          {company?.nature_juridique && (
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
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{apeWarning}</p>
          </div>
        )}

        {!company?.nom_complet && (
          <div className="space-y-2">
            <Label htmlFor="company-name">Nom de votre entreprise</Label>
            <Input
              id="company-name"
              placeholder="Nom de votre entreprise"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(2)}
            className="flex-1"
          >
            Modifier
          </Button>
          <SubmitButton loading={loading} className="flex-1">
            Créer mon espace
          </SubmitButton>
        </div>
      </form>
    </AuthCard>
  );
}
