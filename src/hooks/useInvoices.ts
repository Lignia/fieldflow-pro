import { useQuery } from "@tanstack/react-query";
import { billingDb } from "@/integrations/supabase/schema-clients";

export interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  invoice_kind: string;
  invoice_status: string;
  invoice_date: string | null;
  due_date: string | null;
  total_ttc: number | null;
  total_ht: number | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  property_address: string | null;
  property_postal_code: string | null;
  property_city: string | null;
  project_number: string | null;
  quote_number: string | null;
}

const COLUMNS = [
  "id",
  "invoice_number",
  "invoice_kind",
  "invoice_status",
  "invoice_date",
  "due_date",
  "total_ttc",
  "total_ht",
  "customer_first_name",
  "customer_last_name",
  "customer_name",
  "customer_email",
  "customer_phone",
  "property_address",
  "property_postal_code",
  "property_city",
  "project_number",
  "quote_number",
].join(",");

type StatusFilter = "all" | "deposit" | "final" | "overdue";

export function useInvoices(statusFilter: StatusFilter = "all", search = "") {
  return useQuery<InvoiceRow[]>({
    queryKey: ["invoices", statusFilter, search],
    queryFn: async () => {
      let query = billingDb
        .from("v_invoices_with_context")
        .select(COLUMNS)
        .order("invoice_date", { ascending: false });

      // Kind / status filters
      if (statusFilter === "deposit") {
        query = query.eq("invoice_kind", "deposit");
      } else if (statusFilter === "final") {
        query = query.eq("invoice_kind", "final");
      } else if (statusFilter === "overdue") {
        query = query.in("invoice_status", ["draft", "sent", "partial", "overdue"]);
      }

      // Text search (ilike OR across key columns)
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          [
            `invoice_number.ilike.${term}`,
            `customer_first_name.ilike.${term}`,
            `customer_last_name.ilike.${term}`,
            `customer_name.ilike.${term}`,
            `property_city.ilike.${term}`,
            `project_number.ilike.${term}`,
            `quote_number.ilike.${term}`,
          ].join(",")
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as InvoiceRow[]) ?? [];
    },
  });
}
