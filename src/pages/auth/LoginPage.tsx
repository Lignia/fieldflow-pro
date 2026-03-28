import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, reconfigureAuth } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    reconfigureAuth(remember);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      if (error.status === 429) {
        setRateLimited(true);
        return;
      }
      if (error.status === 400 || error.status === 422) {
        toast.error("Email ou mot de passe incorrect");
        return;
      }
      toast.error(error.message);
      return;
    }
    // AuthGate handles redirect after onAuthStateChange fires
  };

  if (rateLimited) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Trop de tentatives</CardTitle>
            <CardDescription>Veuillez réessayer dans 15 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => setRateLimited(false)}
            >
              Retour à la connexion
            </button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace LIGNIA</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Rester connecté
              </Label>
            </div>
            <SubmitButton loading={loading}>Accéder à mon espace</SubmitButton>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to="/auth/signup" className="text-primary hover:underline font-medium">
              Essai gratuit 14 jours
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
