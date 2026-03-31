import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { coreDb } from "@/integrations/supabase/schema-clients";
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
  const processingRef = useRef(false);

  const processSession = useCallback(async (session: Session | null) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
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
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const setup = () => {
      subscription?.unsubscribe();

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        processSession(session);
      });
      subscription = data.subscription;

      supabase.auth.getSession().then(({ data: { session } }) => {
        processSession(session);
      });
    };

    setup();

    const handleClientChanged = () => {
      setLoading(true);
      setup();
    };
    window.addEventListener("supabase-client-changed", handleClientChanged);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener("supabase-client-changed", handleClientChanged);
    };
  }, [processSession]);

  return { authUser, coreUser, tenantId, userRole, loading, error };
}
