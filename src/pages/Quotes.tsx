import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus,
  Search,
  Filter,
  FileText,
  ArrowRight,
  Eye,
  Send,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── Mock quotes aligned with SQL billing schema ─── */
const mockQuotes = [
  {
    id: 1,
    ref: "DEV-2024-0089",
    project: "Insert Jøtul I520",
    client: "Mme Martin",
    city: "Brive",
    status: "sent",
    totalHT: 5166.67,
    tva10: 396.67,
    tva55: 120.0,
    totalTTC: 6200.0,
    lines: 4,
    validUntil: "25 avr. 2024",
    sentAt: "18 mars 2024",
    maprimerenov: true,
  },
  {
    id: 2,
    ref: "DEV-2024-0088",
    project: "Poêle Invicta Onsen",
    client: "M. Dupont",
    city: "Limoges",
    status: "signed",
    totalHT: 4041.67,
    tva10: 284.17,
    tva55: 120.0,
    totalTTC: 4850.0,
    lines: 3,
    validUntil: "20 avr. 2024",
    sentAt: "12 mars 2024",
    signedAt: "15 mars 2024",
    maprimerenov: true,
  },
  {
    id: 3,
    ref: "DEV-2024-0087",
    project: "Insert Stûv 16-H",
    client: "M. Roche",
    city: "Limoges",
    status: "draft",
    totalHT: 6500.0,
    tva10: 650.0,
    tva55: 0,
    totalTTC: 7800.0,
    lines: 5,
    validUntil: null,
    sentAt: null,
    maprimerenov: false,
  },
  {
    id: 4,
    ref: "DEV-2024-0086",
    project: "Chaudière Morvan MH 22",
    client: "M. Garcia",
    city: "Tulle",
    status: "draft",
    totalHT: 8750.0,
    tva10: 475.0,
    tva55: 350.0,
    totalTTC: 10500.0,
    lines: 6,
    validUntil: null,
    sentAt: null,
    maprimerenov: true,
  },
  {
    id: 5,
    ref: "DEV-2024-0083",
    project: "Poêle Scan 68",
    client: "Mme Laurent",
    city: "Brive",
    status: "signed",
    totalHT: 4500.0,
    tva10: 450.0,
    tva55: 0,
    totalTTC: 5400.0,
    lines: 3,
    validUntil: "5 mars 2024",
    sentAt: "20 fév. 2024",
    signedAt: "24 fév. 2024",
    maprimerenov: false,
  },
  {
    id: 6,
    ref: "DEV-2024-0080",
    project: "Ramonage + Mise en conformité",
    client: "M. Vidal",
    city: "Limoges",
    status: "rejected",
    totalHT: 450.0,
    tva10: 45.0,
    tva55: 0,
    totalTTC: 495.0,
    lines: 2,
    validUntil: "28 fév. 2024",
    sentAt: "14 fév. 2024",
    maprimerenov: false,
  },
];

const stats = {
  draft: mockQuotes.filter((q) => q.status === "draft").length,
  sent: mockQuotes.filter((q) => q.status === "sent").length,
  signed: mockQuotes.filter((q) => q.status === "signed").length,
  rejected: mockQuotes.filter((q) => q.status === "rejected").length,
  totalSigned: mockQuotes
    .filter((q) => q.status === "signed")
    .reduce((sum, q) => sum + q.totalTTC, 0),
  conversionRate: Math.round(
    (mockQuotes.filter((q) => q.status === "signed").length /
      mockQuotes.filter((q) => ["signed", "rejected", "sent"].includes(q.status)).length) *
      100
  ),
};

export default function Quotes() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Devis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockQuotes.length} devis · TVA double taux (10% / 5,5%)
          </p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau devis</span>
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Brouillons</p>
          <p className="text-xl font-bold font-mono mt-1">{stats.draft}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-xl font-bold font-mono mt-1">{stats.sent}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Signés ce mois</p>
          <p className="text-xl font-bold font-mono mt-1 text-accent">
            {stats.totalSigned.toLocaleString("fr-FR")} €
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Taux conversion</p>
          <p className="text-xl font-bold font-mono mt-1">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un devis…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </Button>
      </div>

      {/* Quote table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Réf.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Projet</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Client</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">HT</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TVA</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">TTC</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockQuotes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-xs">{q.ref}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-sm group-hover:text-accent transition-colors">
                      {q.project}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.lines} ligne{q.lines > 1 ? "s" : ""}
                      {q.maprimerenov && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                          MPR
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm">{q.client}</p>
                    <p className="text-xs text-muted-foreground">{q.city}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm">
                    {q.totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="text-xs text-muted-foreground">
                      {q.tva10 > 0 && <span className="block">10%: {q.tva10.toLocaleString("fr-FR")} €</span>}
                      {q.tva55 > 0 && <span className="block text-accent">5,5%: {q.tva55.toLocaleString("fr-FR")} €</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold">
                    {q.totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Aperçu">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {q.status === "draft" && (
                        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Envoyer">
                          <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Télécharger PDF">
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {q.status === "signed" && (
                        <button className="p-1.5 rounded hover:bg-accent/10 transition-colors" title="Convertir en facture">
                          <ArrowRight className="h-3.5 w-3.5 text-accent" />
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
