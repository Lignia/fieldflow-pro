import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setEmailError(null);

    if (password.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);

    // Step 1: Sign up (auto-confirm is enabled in Supabase)
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setLoading(false);
      if (signUpError.message?.includes("already registered") || signUpError.status === 422) {
        setEmailError("already_exists");
        return;
      }
      toast.error(signUpError.message);
      return;
    }

    // Step 2: Auto-login with same credentials
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (loginError) {
      toast.error("Compte créé mais connexion automatique échouée. Veuillez vous connecter.");
      navigate("/auth/login");
      return;
    }

    navigate("/onboarding/company");
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Démarrez votre essai gratuit</CardTitle>
          <CardDescription>14 jours gratuits, sans carte bancaire</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                required
                autoComplete="email"
                autoFocus
              />
              {emailError === "already_exists" && (
                <div className="text-sm text-destructive space-y-1">
                  <p>Un compte existe déjà avec cet email.</p>
                  <p>
                    <Link to="/auth/login" className="underline font-medium">Connexion</Link>
                    {" · "}
                    <Link to="/auth/forgot-password" className="underline font-medium">Mot de passe oublié</Link>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput
                id="password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                required
                autoComplete="new-password"
              />
              <PasswordStrength password={password} />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <SubmitButton loading={loading}>Créer mon compte gratuitement</SubmitButton>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Accéder à mon espace
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
