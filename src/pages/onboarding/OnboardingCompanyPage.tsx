import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/AuthCard";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function OnboardingCompanyPage() {
  const { authUser } = useCurrentUser();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [siretError, setSiretError] = useState<string | null>(null);
  const [siretChecking, setSiretChecking] = useState(false);

  const validateSiret = (value: string) => /^\d{14}$/.test(value);

  const handleSiretBlur = async () => {
    if (!validateSiret(siret)) {
      setSiretError(siret.length > 0 ? "Le SIRET doit contenir exactement 14 chiffres" : null);
      return;
    }
    setSiretError(null);
    setSiretChecking(true);

    try {
      const siren = siret.substring(0, 9);
      const res = await fetch(`https://api.insee.fr/entreprises/sirene/V3/siren/${siren}`, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const unit = data?.uniteLegale;
        if (unit) {
          const period = unit.periodesUniteLegale?.[0];
          if (period?.denominationUniteLegale && !companyName) {
            setCompanyName(period.denominationUniteLegale);
          }
        }
      } else if (res.status === 404) {
        setSiretError("SIRET introuvable — vérifiez le numéro");
      }
    } catch {
      // API INSEE peut être indisponible, on continue silencieusement
    }

    setSiretChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSiret(siret)) {
      setSiretError("Le SIRET doit contenir exactement 14 chiffres");
      return;
    }

    if (!authUser) {
      navigate("/auth/login");
      return;
    }

    setLoading(true);

    const { error } = await supabase.functions.invoke("onboard_tenant", {
      body: {
        company_name: companyName,
        siret,
        phone: phone || undefined,
        email: authUser.email,
      },
    });

    if (error) {
      setLoading(false);
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("siret") && (msg.includes("existe") || msg.includes("already") || msg.includes("duplicate"))) {
        toast.error("Ce SIRET est déjà utilisé par un autre compte");
      } else if (msg.includes("session") || msg.includes("auth")) {
        toast.error("Session expirée, veuillez vous reconnecter");
        navigate("/auth/login");
      } else {
        toast.error("Erreur lors de la création de votre entreprise");
      }
      return;
    }

    // OBLIGATOIRE : recharger le JWT pour qu'il contienne tenant_id
    await supabase.auth.refreshSession();

    navigate("/dashboard");
  };

  return (
    <AuthCard title="Votre entreprise" description="Renseignez les informations de votre entreprise pour commencer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="siret">SIRET</Label>
          <Input
            id="siret"
            placeholder="14 chiffres"
            value={siret}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 14);
              setSiret(v);
              if (siretError) setSiretError(null);
            }}
            onBlur={handleSiretBlur}
            required
            inputMode="numeric"
            maxLength={14}
          />
          {siretError && <p className="text-sm text-destructive">{siretError}</p>}
          {siretChecking && <p className="text-sm text-muted-foreground">Recherche en cours…</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Raison sociale</Label>
          <Input
            id="company"
            placeholder="Nom de votre entreprise"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <SubmitButton loading={loading}>Créer mon espace</SubmitButton>
      </form>
    </AuthCard>
  );
}
