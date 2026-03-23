import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  User,
  FolderKanban,
  Mail,
  Phone,
  RefreshCw,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { useQuoteDetail, UNIT_LABELS } from "@/hooks/useQuoteDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(d: string): string {
  return format(new Date(d), "d MMM yyyy", { locale: fr });
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { quote, loading, error, refetch } = useQuoteDetail(id);

  if (error && !loading) {
    toast.error(error, { id: "quote-detail-error" });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux devis
        </Button>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Devis introuvable</p>
        </Card>
      </div>
    );
  }

  const { customer, project, lines } = quote;

  // Group VAT totals
  const vatGroups = lines.reduce<Record<number, { ht: number; vat: number }>>((acc, line) => {
    if (!acc[line.vat_rate]) acc[line.vat_rate] = { ht: 0, vat: 0 };
    acc[line.vat_rate].ht += line.total_line_ht;
    acc[line.vat_rate].vat += line.total_line_ht * (line.vat_rate / 100);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Devis
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {quote.quote_number}
              </h1>
              {quote.version_number > 1 && (
                <span className="text-sm text-muted-foreground">v{quote.version_number}</span>
              )}
              <StatusBadge status={quote.quote_kind} type="quote_kind" size="md" />
              <StatusBadge status={quote.quote_status} type="quote" size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {customer.name}
              {project && (
                <span>
                  {" "}
                  ·{" "}
                  <button
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {project.project_number}
                  </button>
                </span>
              )}
            </p>
          </div>
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Réessayer
            </Button>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Date du devis
          </p>
          <p className="text-sm font-medium">{formatDate(quote.quote_date)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Validité
          </p>
          <p className="text-sm font-medium">{formatDate(quote.expiry_date)}</p>
          {quote.quote_status === "sent" && new Date(quote.expiry_date) < new Date() && (
            <p className="text-xs text-destructive mt-0.5">Expiré</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Envoyé le</p>
          <p className="text-sm font-medium">
            {quote.sent_at ? formatDate(quote.sent_at) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Signé le</p>
          <p className="text-sm font-medium">
            {quote.signed_at ? formatDate(quote.signed_at) : "—"}
          </p>
        </Card>
      </div>

      {/* Client info */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Client</h2>
          <CustomerBadge customerType={customer.customer_type as any} size="sm" />
        </div>
        <p className="font-medium text-sm">{customer.name}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {customer.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {customer.email}
            </span>
          )}
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {customer.phone}
            </span>
          )}
        </div>
      </Card>

      {/* Lines table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Lignes du devis ({lines.length})</h2>
        {lines.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucune ligne</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Désignation</TableHead>
                    <TableHead className="text-right w-[80px]">Qté</TableHead>
                    <TableHead className="text-right w-[80px]">Unité</TableHead>
                    <TableHead className="text-right w-[100px]">P.U. HT</TableHead>
                    <TableHead className="text-right w-[70px]">TVA</TableHead>
                    <TableHead className="text-right w-[110px]">Total HT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium text-sm">{line.label}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{line.qty}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {line.unit ? UNIT_LABELS[line.unit] ?? line.unit : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(line.unit_price_ht)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {line.vat_rate}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(line.total_line_ht)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Totals */}
      <Card className="p-5">
        <div className="flex flex-col items-end gap-1.5 text-sm">
          <div className="flex items-center justify-between w-full max-w-xs">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-mono font-medium">{formatCurrency(quote.total_ht)}</span>
          </div>

          {Object.entries(vatGroups)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([rate, { ht, vat }]) => (
              <div key={rate} className="flex items-center justify-between w-full max-w-xs">
                <span className="text-muted-foreground">
                  TVA {rate}% <span className="text-xs">({formatCurrency(ht)} HT)</span>
                </span>
                <span className="font-mono text-sm">{formatCurrency(vat)}</span>
              </div>
            ))}

          <Separator className="my-1 max-w-xs w-full" />

          <div className="flex items-center justify-between w-full max-w-xs">
            <span className="font-semibold">Total TTC</span>
            <span className="font-mono font-bold text-base">{formatCurrency(quote.total_ttc)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
