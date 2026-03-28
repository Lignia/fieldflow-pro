import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OnboardingLayout } from "@/components/auth/OnboardingLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function OnboardingProfilePage() {
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Prénom et nom sont obligatoires");
      return;
    }

    if (!coreUser?.id) {
      toast.warning("Profil non sauvegardé — vous pourrez le compléter dans vos paramètres.");
      navigate("/dashboard");
      return;
    }

    setLoading(true);
    try {
      const { error } = await coreDb
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", coreUser.id);

      if (error) {
        console.error("Profile update error:", error);
        toast.warning("Profil non sauvegardé — vous pourrez le compléter dans vos paramètres.");
      } else {
        toast.success(`Bienvenue sur LIGNIA, ${firstName.trim()} ! Votre espace est prêt.`);
      }
    } catch (err) {
      console.error("Profile update exception:", err);
      toast.warning("Profil non sauvegardé — vous pourrez le compléter dans vos paramètres.");
    } finally {
      setLoading(false);
      navigate("/dashboard");
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <OnboardingLayout currentStep={2}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Dernière étape</CardTitle>
          <CardDescription>Comment devons-nous vous appeler ?</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Patrick"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                Pour que notre équipe puisse vous accompagner lors de votre démarrage
              </p>
            </div>

            <SubmitButton loading={loading}>
              Accéder à mon tableau de bord
              <ArrowRight className="ml-2 h-4 w-4" />
            </SubmitButton>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-primary underline"
            >
              Passer cette étape → je compléterai plus tard
            </button>
          </div>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
