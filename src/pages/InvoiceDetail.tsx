import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { billingDb } from "@/integrations/supabase/schema-clients";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceKindBadge } from "@/components/InvoiceKindBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageContainer } from "@/components/PageContainer";

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_kind: string;
  invoice_status: string;
  invoice_date: string;
  due_date: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  quote_id: string | null;
  quote_number: string | null;
  project_id: string | null;
  project_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  property_address: string | null;
  property_postal_code: string | null;
  property_city: string | null;
}

interface InvoiceLine {
  id: string;
  label: string;
  qty: number;
  unit: string | null;
  unit_price_ht: number;
  vat_rate: number;
  total_line_ht: number;
  sort_order: number;
}

function fmtMoney(v: number | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "d MMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

function customerLabel(inv: InvoiceData) {
  if (inv.customer_name) return inv.customer_name;
  return (
    [inv.customer_first_name, inv.customer_last_name].filter(Boolean).join(" ") ||
    "Client"
  );
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [invRes, linesRes] = await Promise.all([
          billingDb
            .from("v_invoices_with_context")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          billingDb
            .from("invoice_lines")
            .select(
              "id, label, qty, unit, unit_price_ht, vat_rate, total_line_ht, sort_order",
            )
            .eq("invoice_id", id)
            .order("sort_order", { ascending: true }),
        ]);

        if (cancelled) return;
        if (invRes.error) {
          setError(invRes.error.message);
          return;
        }
        if (!invRes.data) {
          setError("Facture introuvable");
          return;
        }
        setInvoice(invRes.data as InvoiceData);
        setLines((linesRes.data ?? []) as InvoiceLine[]);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (error || !invoice) {
    return (
      <PageContainer>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2"
          onClick={() => navigate("/invoices")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Factures
        </Button>
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {error ?? "Facture introuvable"}
        </Card>
      </PageContainer>
    );
  }

  const fullAddress = [
    invoice.property_address,
    [invoice.property_postal_code, invoice.property_city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <PageContainer>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate("/invoices")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Factures
      </Button>

      {/* Header */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight font-mono">
                {invoice.invoice_number}
              </h1>
              <InvoiceKindBadge kind={invoice.invoice_kind as any} />
              <StatusBadge status={invoice.invoice_status} type="invoice" />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>Émise le {fmtDate(invoice.invoice_date)}</span>
              <span>Échéance {fmtDate(invoice.due_date)}</span>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button variant="outline" size="sm" disabled>
                  <FileDown className="h-3.5 w-3.5 mr-1" />
                  Générer PDF
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>PDF facture bientôt disponible</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Client
            </p>
            {invoice.customer_id ? (
              <button
                onClick={() => navigate(`/clients/${invoice.customer_id}`)}
                className="text-primary hover:underline font-medium text-left"
              >
                {customerLabel(invoice)}
              </button>
            ) : (
              <p className="font-medium">{customerLabel(invoice)}</p>
            )}
            {invoice.customer_email && (
              <p className="text-xs text-muted-foreground">{invoice.customer_email}</p>
            )}
            {invoice.customer_phone && (
              <p className="text-xs text-muted-foreground font-mono">
                {invoice.customer_phone}
              </p>
            )}
            {fullAddress && (
              <p className="text-xs text-muted-foreground">{fullAddress}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Origine
            </p>
            {invoice.quote_id ? (
              <button
                onClick={() => navigate(`/quotes/${invoice.quote_id}`)}
                className="text-primary hover:underline flex items-center gap-1 font-mono text-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                {invoice.quote_number ?? "Devis source"}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sans devis lié</p>
            )}
            {invoice.project_id && invoice.project_number && (
              <button
                onClick={() => navigate(`/projects/${invoice.project_id}`)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline block font-mono"
              >
                {invoice.project_number}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Lines */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />
            Lignes de facturation
            <span className="text-muted-foreground font-normal text-xs ml-1">
              ({lines.length})
            </span>
          </h2>
        </div>
        {lines.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucune ligne
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">PU HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.label}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(l.qty).toLocaleString("fr-FR")}
                      {l.unit ? ` ${l.unit}` : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fmtMoney(l.unit_price_ht)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {Number(l.vat_rate)} %
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {fmtMoney(l.total_line_ht)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t p-4 flex justify-end">
          <div className="w-full sm:w-72 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-mono">{fmtMoney(invoice.total_ht)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-mono">{fmtMoney(invoice.total_vat)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total TTC</span>
              <span className="font-mono">{fmtMoney(invoice.total_ttc)}</span>
            </div>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}