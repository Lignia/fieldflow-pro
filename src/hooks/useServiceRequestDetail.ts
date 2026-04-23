import { useCallback, useEffect, useState } from "react";
import { operationsDb } from "@/integrations/supabase/schema-clients";
import type { ServiceRequest } from "./useServiceRequests";

export type ContactEventType =
  | "inbound_call"
  | "outbound_call"
  | "email_received"
  | "email_sent"
  | "sms_sent"
  | "visit"
  | "voicemail"
  | "internal_note";

export type ContactEventOutcome =
  | "resolved"
  | "callback_scheduled"
  | "intervention_created"
  | "no_answer"
  | "left_voicemail"
  | "transferred"
  | "other";

export interface ContactEvent {
  id: string;
  tenant_id: string;
  service_request_id: string | null;
  customer_id: string | null;
  installation_id: string | null;
  project_id: string | null;
  event_type: ContactEventType;
  direction: string | null;
  subject: string | null;
  body: string | null;
  duration_seconds: number | null;
  outcome: ContactEventOutcome | null;
  handled_by: string | null;
  occurred_at: string;
  created_at: string;
}

interface UseServiceRequestDetailReturn {
  request: ServiceRequest | null;
  events: ContactEvent[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refetch: () => void;
}

export function useServiceRequestDetail(
  id: string | undefined,
): UseServiceRequestDetailReturn {
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [events, setEvents] = useState<ContactEvent[]>([]);
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

    const [reqRes, evtRes] = await Promise.all([
      operationsDb
        .from("v_service_requests_with_context")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      operationsDb
        .from("contact_events")
        .select("*")
        .eq("service_request_id", id)
        .order("occurred_at", { ascending: false }),
    ]);

    if (reqRes.error) {
      setError(reqRes.error.message);
      setRequest(null);
    } else if (!reqRes.data) {
      setNotFound(true);
      setRequest(null);
    } else {
      setRequest(reqRes.data as ServiceRequest);
    }

    if (evtRes.error) {
      setError((prev) => prev ?? evtRes.error.message);
      setEvents([]);
    } else {
      setEvents((evtRes.data ?? []) as ContactEvent[]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { request, events, loading, error, notFound, refetch: fetchAll };
}
