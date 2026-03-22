import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { jwtDecode } from "jwt-decode";
import type { User, Session } from "@supabase/supabase-js";

interface JwtPayload {
  tenant_id?: string;
  user_role?: string;
}

interface CoreUser {
  id: string;
  auth_uid: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  [key: string]: unknown;
}

interface UseCurrentUserReturn {
  authUser: User | null;
  coreUser: CoreUser | null;
  tenantId: string | null;
  userRole: string | null;
  loading: boolean;
  error: string | null;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [coreUser, setCoreUser] = useState<CoreUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processSession = async (session: Session | null) => {
    if (!session) {
      setAuthUser(null);
      setCoreUser(null);
      setTenantId(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    const user = session.user;
    setAuthUser(user);

    try {
      const decoded = jwtDecode<JwtPayload>(session.access_token);
      const tid = decoded.tenant_id ?? null;
      const role = decoded.user_role ?? null;
      setTenantId(tid);
      setUserRole(role);

      if (!tid) {
        setCoreUser(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await (supabase as any)
        .schema("core")
        .from("users")
        .select("*")
        .eq("auth_uid", user.id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setCoreUser(null);
      } else {
        setCoreUser(data as unknown as CoreUser);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message ?? "Erreur de décodage de la session");
      setCoreUser(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        processSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { authUser, coreUser, tenantId, userRole, loading, error };
}
