import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OnboardingLayout } from "@/components/auth/OnboardingLayout";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function OnboardingProfilePage() {
  const navigate = useNavigate();
  const { coreUser, loading: userLoading } = useCurrentUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const retryRef = useRef(0);
  const [retrying, setRetrying] = useState(false);

  // Retry loading coreUser if not available after initial load
  useEffect(() => {
    if (!userLoading && !coreUser && retryRef.current < 3) {
      setRetrying(true);
      const timer = setTimeout(() => {
        retryRef.current += 1;
        setRetrying(false);
        // Force re-render by toggling state - useCurrentUser will re-fetch
        window.dispatchEvent(new Event("supabase-client-changed"));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [userLoading, coreUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Prénom et nom sont obligatoires");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user?.id;

      if (!authUid) {
        toast.warning("Profil non sauvegardé — vous pourrez le compléter dans vos paramètres.");
        navigate("/dashboard");
        return;
      }

      const { error } = await coreDb
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq("auth_uid", authUid);

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

  // Loading state with skeleton
  if (userLoading || retrying) {
    return (
      <OnboardingLayout currentStep={2}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Dernière étape</CardTitle>
            <CardDescription>Chargement de votre profil…</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </OnboardingLayout>
    );
  }

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
