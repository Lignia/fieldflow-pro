import { useCallback, useEffect, useState } from "react";
import { coreDb, operationsDb } from "@/integrations/supabase/schema-clients";
import type { Intervention } from "./useInterventions";

export interface InterventionActivity {
  id: string;
  activity_type: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
}

interface UseInterventionDetailReturn {
  intervention: Intervention | null;
  activities: InterventionActivity[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refetch: () => void;
}

export function useInterventionDetail(
  id: string | undefined,
): UseInterventionDetailReturn {
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [activities, setActivities] = useState<InterventionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);

    const [intRes, actRes] = await Promise.all([
      operationsDb
        .from("v_interventions_with_context")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      coreDb
        .from("activities")
        .select("id, activity_type, payload, occurred_at")
        .eq("scope_type", "intervention")
        .eq("scope_id", id)
        .order("occurred_at", { ascending: false })
        .limit(20),
    ]);

    if (intRes.error) {
      setError(intRes.error.message);
      setIntervention(null);
    } else if (!intRes.data) {
      setNotFound(true);
      setIntervention(null);
    } else {
      setIntervention(intRes.data as Intervention);
    }

    if (actRes.error) {
      // Activities are non-blocking
      setActivities([]);
    } else {
      setActivities((actRes.data ?? []) as InterventionActivity[]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    intervention,
    activities,
    loading,
    error,
    notFound,
    refetch: fetchAll,
  };
}
