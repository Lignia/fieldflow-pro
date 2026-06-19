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
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

// ── Indicateur de force du mot de passe ────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(password) },
    { label: "Un chiffre", ok: /\d/.test(password) },
    { label: "Un caractère spécial", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const levels = [
    { label: "Très faible", color: "bg-destructive" },
    { label: "Faible", color: "bg-warning" },
    { label: "Moyen", color: "bg-warning" },
    { label: "Fort", color: "bg-success" },
    { label: "Très fort", color: "bg-success" },
  ];
  const level = levels[score];

  return (
    <div className="space-y-2 pt-1">
      {/* Barre de progression */}
      <div className="flex gap-1">
        {levels.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < score ? level.color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{level.label}</p>
      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-xs">
            <CheckCircle2
              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                c.ok ? "text-success" : "text-muted-foreground/40"
              }`}
            />
            <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page principale ─────────────────────────────────────────────
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);   // attente validation token
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const hasToken =
    location.hash.includes("access_token") ||
    location.hash.includes("type=recovery");

  useEffect(() => {
    if (!hasToken) {
      setInvalidLink(true);
      setVerifying(false);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecoveryReady(true);
          setVerifying(false);
        }
      }
    );

    // Timeout de sécurité : si Supabase ne répond pas en 5s, lien invalide
    const timer = setTimeout(() => {
      if (!recoveryReady) {
        setInvalidLink(true);
        setVerifying(false);
      }
    }, 5000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [hasToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryReady) return;

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

    setSuccess(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  // ── Vérification du token en cours ─────────────────────────
  if (verifying) {
    return (
      <AuthLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Vérification du lien…</p>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // ── Lien invalide ou expiré ─────────────────────────────────
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
              Ce lien de réinitialisation est invalide ou a expiré.
              Les liens sont valables <strong>1 heure</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button asChild className="w-full">
              <Link to="/auth/forgot-password">Demander un nouveau lien</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth/login">Retour à la connexion</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // ── Succès ──────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
              <ShieldCheck className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-xl">Mot de passe mis à jour</CardTitle>
            <CardDescription>
              Votre mot de passe a bien été modifié.
              Vous allez être redirigé vers votre tableau de bord…
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // ── Formulaire principal ────────────────────────────────────
  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un mot de passe sécurisé pour votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirm"
                placeholder="Répétez votre mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {confirm && password && confirm !== password && (
                <p className="text-xs text-destructive flex items-center gap-1.5 pt-0.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Les mots de passe ne correspondent pas
                </p>
              )}
              {confirm && password && confirm === password && (
                <p className="text-xs text-success flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Les mots de passe correspondent
                </p>
              )}
            </div>

            <SubmitButton
              loading={loading}
              disabled={!recoveryReady || password !== confirm || password.length < 8}
            >
              Mettre à jour le mot de passe
            </SubmitButton>

            <div className="text-center">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth/login">Retour à la connexion</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
