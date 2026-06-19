import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/icons",
  "/design-system",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function EmailBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const { authUser } = useCurrentUser();

  if (dismissed || !authUser || authUser.email_confirmed_at) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await supabase.auth.resend({ type: "signup", email: authUser.email! });
      toast.success("Email renvoyé !");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-0 inset-x-0 z-50 h-11 bg-warning/10 border-b border-warning/20 flex items-center justify-center px-4 gap-3 text-sm">
      <Mail className="h-4 w-4 text-warning shrink-0" />
      <span className="text-foreground truncate">
        Confirmez votre email pour activer l'envoi de documents à vos clients.
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs shrink-0"
        onClick={handleResend}
        disabled={sending}
      >
        {sending ? "Envoi…" : "Renvoyer l'email"}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * RecoveryRedirect — intercepte le hash #type=recovery généré par Supabase
 * quand {{ .ConfirmationURL }} pointe vers la racine du site.
 * Redirige immédiatement vers /auth/reset-password en conservant le hash intact.
 */
function RecoveryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auth/reset-password" + window.location.hash, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authUser, tenantId, loading } = useCurrentUser();
  const { pathname } = useLocation();

  // ── Interception du lien de reset password ──────────────────
  // Supabase envoie {{ .ConfirmationURL }} qui pointe vers la racine
  // avec #access_token=...&type=recovery dans le hash.
  // On intercepte ici et on redirige vers /auth/reset-password.
  const hash = window.location.hash;
  const isRecoveryHash =
    hash.includes("type=recovery") ||
    (hash.includes("access_token") && hash.includes("type=recovery"));

  if (isRecoveryHash && pathname !== "/auth/reset-password") {
    return <RecoveryRedirect />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPublic = isPublicRoute(pathname);
  const isAuthRoute = pathname.startsWith("/auth/");
  const isOnboarding = pathname.startsWith("/onboarding/");

  // Not authenticated
  if (!authUser) {
    return isPublic ? <>{children}</> : <Navigate to="/auth/login" replace />;
  }

  // Authenticated but no tenant_id in JWT
  if (!tenantId) {
    if (isOnboarding) return <>{children}</>;
    if (isAuthRoute) return <Navigate to="/onboarding/company" replace />;
    if (isPublic) return <>{children}</>;
    return <Navigate to="/onboarding/company" replace />;
  }

  // Fully authenticated with tenant
  if (isAuthRoute) return <Navigate to="/dashboard" replace />;
  if (pathname === "/onboarding/company") return <Navigate to="/dashboard" replace />;

  // Show email banner on protected routes
  const showBanner = !isPublic && !isOnboarding;

  return (
    <>
      {showBanner && <EmailBanner />}
      {showBanner && authUser && !authUser.email_confirmed_at && <div className="h-11" />}
      {children}
    </>
  );
}
