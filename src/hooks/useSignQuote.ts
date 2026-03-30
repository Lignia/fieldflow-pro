import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";

export interface SignQuoteResult {
  quote_id:        string;
  invoice_id:      string;
  invoice_number:  string;
  installation_id: string;
  deposit_ttc:     number;
}

interface UseSignQuoteReturn {
  signQuote: (quoteId: string) =>
    Promise<SignQuoteResult | null>;
  signing: boolean;
  error: string | null;
}

export function useSignQuote(): UseSignQuoteReturn {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signQuote(
    quoteId: string
  ): Promise<SignQuoteResult | null> {
    setSigning(true);
    setError(null);

    try {
      const { data: { session } } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Session expirée. Reconnectez-vous."
        );
      }

      const jwt = JSON.parse(
        atob(session.access_token.split(".")[1])
      );
      const sub      = jwt?.sub      ?? null;
      const tenantId = jwt?.tenant_id ?? null;

      if (!sub || !tenantId) {
        throw new Error(
          "Session expirée. Reconnectez-vous."
        );
      }

      const { data: coreUser, error: userErr } =
        await coreDb
          .from("users")
          .select("id")
          .eq("auth_uid", sub)
          .maybeSingle();

      if (userErr) throw new Error(userErr.message);
      if (!coreUser?.id) {
        throw new Error(
          "Utilisateur introuvable dans core.users."
        );
      }

      const { data, error: rpcErr } =
        await billingDb.rpc(
          "sign_quote_and_initialize",
          {
            p_quote_id:    quoteId,
            p_tenant_id:   tenantId,
            p_actor_id:    coreUser.id,
            p_deposit_pct: 0.30,
          }
        );

      if (rpcErr) throw new Error(rpcErr.message);

      return data as SignQuoteResult;

    } catch (err: any) {
      const msg = err?.message ??
        "Erreur lors de la signature";
      setError(msg);
      return null;
    } finally {
      setSigning(false);
    }
  }

  return { signQuote, signing, error };
}
