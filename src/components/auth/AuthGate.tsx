import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";

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

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authUser, tenantId, loading } = useCurrentUser();
  const { pathname } = useLocation();

  if (DEV_BYPASS) return <>{children}</>;

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

  // Fully authenticated
  if (isAuthRoute) return <Navigate to="/dashboard" replace />;
  if (isOnboarding) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
