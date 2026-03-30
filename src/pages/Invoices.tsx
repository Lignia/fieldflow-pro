import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Receipt, Search, Plus } from "lucide-react";
import { useInvoices, type InvoiceRow } from "@/hooks/useInvoices";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceKindBadge } from "@/components/InvoiceKindBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type StatusFilter = "all" | "deposit" | "final" | "overdue";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "deposit", label: "Acomptes" },
  { value: "final", label: "Soldes" },
  { value: "overdue", label: "Impayées" },
];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function customerLabel(row: InvoiceRow) {
  if (row.customer_name) return row.customer_name;
  return [row.customer_first_name, row.customer_last_name].filter(Boolean).join(" ") || "—";
}

export default function Invoices() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: invoices, isLoading, isError } = useInvoices(filter, search);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Factures
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi des factures émises
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="default" size="sm" disabled className="gap-1.5">
                <Plus className="h-4 w-4" />
                Nouvelle facture
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Création manuelle bientôt disponible</TooltipContent>
        </Tooltip>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="xs"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Receipt className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">Erreur lors du chargement des factures</p>
        </div>
      ) : !invoices?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Receipt className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">Aucune facture trouvée</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Projet</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Échéance</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-medium">
                    {inv.invoice_number || "—"}
                  </TableCell>
                  <TableCell>
                    <InvoiceKindBadge kind={inv.invoice_kind as any} />
                  </TableCell>
                  <TableCell>{customerLabel(inv)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {inv.project_number || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDate(inv.invoice_date)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatDate(inv.due_date)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(inv.total_ttc)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inv.invoice_status} type="invoice" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
