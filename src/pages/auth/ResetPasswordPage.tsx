import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const hasToken =
    location.hash.includes("access_token") ||
    location.hash.includes("type=recovery");

  useEffect(() => {
    if (!hasToken) {
      setInvalidLink(true);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecoveryReady(true);
        }
      }
    );
    return () => authListener.subscription.unsubscribe();
  }, [hasToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Mot de passe mis à jour");
    navigate("/dashboard");
  };

  if (invalidLink) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <CardTitle className="text-xl">Lien invalide ou expiré</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation est invalide ou a expiré (valable 1 heure).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/auth/forgot-password">Demander un nouveau lien</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe pour votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <PasswordInput
                id="password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirm"
                placeholder="Confirmez votre mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <SubmitButton loading={loading}>Mettre à jour</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
