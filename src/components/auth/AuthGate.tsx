import { Navigate, useLocation } from "react-router-dom";
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

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authUser, tenantId, loading } = useCurrentUser();
  const { pathname } = useLocation();

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
