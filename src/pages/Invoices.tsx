import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Send,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── Mock invoices aligned with SQL billing schema ─── */
const mockInvoices = [
  {
    id: 1,
    ref: "FAC-2024-0038",
    quoteRef: "DEV-2024-0088",
    project: "Poêle Invicta Onsen",
    client: "M. Dupont",
    city: "Limoges",
    status: "pending",
    totalHT: 4041.67,
    totalTTC: 4850.0,
    issuedAt: "16 mars 2024",
    dueDate: "15 avr. 2024",
    daysOverdue: 0,
    paymentMethod: null,
  },
  {
    id: 2,
    ref: "FAC-2024-0037",
    quoteRef: "DEV-2024-0083",
    project: "Poêle Scan 68",
    client: "Mme Laurent",
    city: "Brive",
    status: "paid",
    totalHT: 4500.0,
    totalTTC: 5400.0,
    issuedAt: "1 mars 2024",
    dueDate: "31 mars 2024",
    paidAt: "12 mars 2024",
    daysOverdue: 0,
    paymentMethod: "virement",
  },
  {
    id: 3,
    ref: "FAC-2024-0034",
    quoteRef: "DEV-2024-0078",
    project: "Tubage inox — rénovation",
    client: "M. Vidal",
    city: "Limoges",
    status: "overdue",
    totalHT: 3166.67,
    totalTTC: 3800.0,
    issuedAt: "28 fév. 2024",
    dueDate: "29 mars 2024",
    daysOverdue: 18,
    paymentMethod: null,
  },
  {
    id: 4,
    ref: "FAC-2024-0031",
    quoteRef: "DEV-2024-0074",
    project: "Insert fonte — remplacement",
    client: "Mme Blanc",
    city: "Guéret",
    status: "overdue",
    totalHT: 1625.0,
    totalTTC: 1950.0,
    issuedAt: "15 fév. 2024",
    dueDate: "16 mars 2024",
    daysOverdue: 32,
    paymentMethod: null,
  },
  {
    id: 5,
    ref: "FAC-2024-0028",
    quoteRef: "DEV-2024-0069",
    project: "Chaudière granulés — neuf",
    client: "M. Rousseau",
    city: "Tulle",
    status: "overdue",
    totalHT: 4333.33,
    totalTTC: 5200.0,
    issuedAt: "1 fév. 2024",
    dueDate: "2 mars 2024",
    daysOverdue: 45,
    paymentMethod: null,
  },
  {
    id: 6,
    ref: "FAC-2024-0025",
    quoteRef: "DEV-2024-0065",
    project: "Ramonage + entretien",
    client: "M. Perrin",
    city: "Tulle",
    status: "paid",
    totalHT: 166.67,
    totalTTC: 200.0,
    issuedAt: "20 janv. 2024",
    dueDate: "19 fév. 2024",
    paidAt: "25 janv. 2024",
    daysOverdue: 0,
    paymentMethod: "chèque",
  },
];

const totalOverdue = mockInvoices
  .filter((i) => i.status === "overdue")
  .reduce((sum, i) => sum + i.totalTTC, 0);
const totalPending = mockInvoices
  .filter((i) => i.status === "pending")
  .reduce((sum, i) => sum + i.totalTTC, 0);
const totalPaid = mockInvoices
  .filter((i) => i.status === "paid")
  .reduce((sum, i) => sum + i.totalTTC, 0);

export default function Invoices() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Factures
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockInvoices.length} factures · Suivi des paiements
          </p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle facture</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Payées"
          value={`${totalPaid.toLocaleString("fr-FR")} €`}
          icon={<CheckCircle2 className="h-4 w-4 text-accent" />}
        />
        <KPICard
          label="En attente"
          value={`${totalPending.toLocaleString("fr-FR")} €`}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
        <KPICard
          label="Impayées"
          value={`${totalOverdue.toLocaleString("fr-FR")} €`}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        />
        <KPICard
          label="Délai moyen"
          value="12j"
          trend={{ value: -8, label: "vs mois dernier" }}
          icon={<Euro className="h-4 w-4" />}
        />
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une facture…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </Button>
      </div>

      {/* Invoice table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Réf.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Projet</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Client</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TTC</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Échéance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group ${
                    inv.daysOverdue > 30 ? "bg-destructive/[0.02]" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <span className="font-mono text-xs block">{inv.ref}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">← {inv.quoteRef}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-sm group-hover:text-accent transition-colors">
                      {inv.project}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm">{inv.client}</p>
                    <p className="text-xs text-muted-foreground">{inv.city}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold">
                    {inv.totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-xs text-muted-foreground">{inv.dueDate}</span>
                    {inv.daysOverdue > 0 && (
                      <span className={`block text-xs font-medium mt-0.5 ${inv.daysOverdue > 30 ? "text-destructive" : "text-warning"}`}>
                        +{inv.daysOverdue}j de retard
                      </span>
                    )}
                    {inv.status === "paid" && inv.paymentMethod && (
                      <span className="block text-xs text-accent mt-0.5">
                        {inv.paymentMethod}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Aperçu">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Télécharger PDF">
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {inv.status === "overdue" && (
                        <button className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Relancer">
                          <Send className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
