import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Euro,
  FileText,
  CalendarDays,
  AlertTriangle,
  Clock,
  Flame,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

/* ─── Mock data aligned with SQL schema ─── */

const mockProjects = [
  {
    id: 1,
    ref: "PRJ-2024-0047",
    name: "Poêle à bois Invicta Onsen",
    status: "installation_scheduled",
    client: "M. Dupont",
    city: "Limoges",
    amount: 4850,
    dueDate: "28 mars",
  },
  {
    id: 2,
    ref: "PRJ-2024-0046",
    name: "Insert Jøtul I520",
    status: "quote_sent",
    client: "Mme Martin",
    city: "Brive-la-Gaillarde",
    amount: 6200,
    dueDate: "25 mars",
  },
  {
    id: 3,
    ref: "PRJ-2024-0045",
    name: "Chaudière bois Morvan MH 22",
    status: "survey_scheduled",
    client: "M. Garcia",
    city: "Tulle",
    amount: null,
    dueDate: "22 mars",
  },
  {
    id: 4,
    ref: "PRJ-2024-0044",
    name: "Tubage inox Ø150 — 8m",
    status: "installation_in_progress",
    client: "M. Lemoine",
    city: "Guéret",
    amount: 3100,
    dueDate: "Aujourd'hui",
  },
  {
    id: 5,
    ref: "PRJ-2024-0043",
    name: "Poêle granulés MCZ Ego Air",
    status: "lead_qualified",
    client: "Mme Faure",
    city: "Ussel",
    amount: null,
    dueDate: "30 mars",
  },
];

const mockInterventions = [
  {
    id: 1,
    type: "installation",
    label: "Pose poêle + tubage",
    client: "M. Lemoine",
    address: "12 rue des Lilas, Guéret",
    time: "08:00",
    duration: "6h",
    tech: "J. Morel",
    status: "in_progress",
  },
  {
    id: 2,
    type: "ramonage",
    label: "Ramonage annuel conduit inox",
    client: "Mme Petit",
    address: "8 av. de la Gare, Limoges",
    time: "09:00",
    duration: "1h",
    tech: "P. Roux",
    status: "scheduled",
  },
  {
    id: 3,
    type: "sav",
    label: "SAV — Fuite raccord fumisterie",
    client: "M. Bernard",
    address: "3 pl. du Marché, Brive",
    time: "14:00",
    duration: "2h",
    tech: "P. Roux",
    status: "scheduled",
    priority: "high",
  },
  {
    id: 4,
    type: "visite_technique",
    label: "Visite technique — Étude faisabilité",
    client: "Mme Martin",
    address: "15 rue Voltaire, Brive",
    time: "16:30",
    duration: "1h30",
    tech: "J. Morel",
    status: "scheduled",
  },
];

const mockQuotesRecent = [
  { id: 1, ref: "DEV-2024-0089", client: "Mme Martin", amount: 6200, status: "sent", age: "3j" },
  { id: 2, ref: "DEV-2024-0088", client: "M. Dupont", amount: 4850, status: "signed", age: "5j" },
  { id: 3, ref: "DEV-2024-0087", client: "M. Roche", amount: 2300, status: "draft", age: "1j" },
];

const mockOverdueInvoices = [
  { id: 1, ref: "FAC-2024-0034", client: "M. Vidal", amount: 3800, daysOverdue: 18 },
  { id: 2, ref: "FAC-2024-0031", client: "Mme Blanc", amount: 1950, daysOverdue: 32 },
  { id: 3, ref: "FAC-2024-0028", client: "M. Rousseau", amount: 5200, daysOverdue: 45 },
];

const interventionTypeIcons: Record<string, string> = {
  installation: "🔧",
  ramonage: "🧹",
  sav: "⚠️",
  visite_technique: "📋",
};

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mardi 21 mars 2026 — Bonne journée, Jean-Pierre
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="CA du mois"
          value="12 847 €"
          trend={{ value: 8, label: "vs mois dernier" }}
          icon={<Euro className="h-4 w-4" />}
        />
        <KPICard
          label="Devis en attente"
          value="7"
          trend={{ value: -2, label: "vs semaine dernière" }}
          icon={<FileText className="h-4 w-4" />}
        />
        <KPICard
          label="Interventions semaine"
          value="12"
          trend={{ value: 15, label: "vs semaine dernière" }}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <KPICard
          label="Factures impayées"
          value="5 950 €"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Two-column layout: Pipeline + Agenda */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline — 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projets en cours</h2>
            <Link
              to="/projects"
              className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {mockProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/20 cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">
                      {p.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">{p.ref}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{p.client}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{p.city}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {p.amount && (
                    <span className="text-sm font-mono font-medium text-foreground/70">
                      {p.amount.toLocaleString("fr-FR")} €
                    </span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda du jour — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Agenda du jour</h2>
            <Link
              to="/planning"
              className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
              Planning <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {mockInterventions.map((i) => (
              <div
                key={i.id}
                className={`flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                  i.priority === "high" ? "border-destructive/30 bg-destructive/[0.02]" : ""
                }`}
              >
                <div className="text-center shrink-0 pt-0.5">
                  <div className="text-lg leading-none">
                    {interventionTypeIcons[i.type] || "📌"}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{i.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {i.client} — {i.address}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {i.time}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{i.duration}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{i.tech}</span>
                  </div>
                </div>
                <StatusBadge status={i.status} className="shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Recent quotes + Overdue invoices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent quotes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Derniers devis</h2>
            <Link
              to="/quotes"
              className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Réf.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Montant</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {mockQuotesRecent.map((q) => (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs">{q.ref}</td>
                    <td className="px-4 py-3">{q.client}</td>
                    <td className="px-4 py-3 text-right font-mono">{q.amount.toLocaleString("fr-FR")} €</td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue invoices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" />
              Factures en retard
            </h2>
            <Link
              to="/invoices"
              className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Réf.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Montant</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Retard</th>
                </tr>
              </thead>
              <tbody>
                {mockOverdueInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs">{inv.ref}</td>
                    <td className="px-4 py-3">{inv.client}</td>
                    <td className="px-4 py-3 text-right font-mono">{inv.amount.toLocaleString("fr-FR")} €</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${inv.daysOverdue > 30 ? "text-destructive" : "text-warning"}`}>
                        +{inv.daysOverdue}j
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
