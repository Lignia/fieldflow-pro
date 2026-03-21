import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Euro, FileText, CalendarDays, AlertTriangle } from "lucide-react";

const mockProjects = [
  { id: 1, name: "Dupont — Poêle Invicta", status: "survey_scheduled", client: "M. Dupont" },
  { id: 2, name: "Martin — Insert Jøtul", status: "quote_sent", client: "Mme Martin" },
  { id: 3, name: "Garcia — Chaudière bois", status: "installation_in_progress", client: "M. Garcia" },
  { id: 4, name: "Lemoine — Tubage inox", status: "lead_qualified", client: "M. Lemoine" },
];

const mockInterventions = [
  { id: 1, type: "Ramonage", client: "Mme Petit", time: "09:00", tech: "J. Morel" },
  { id: 2, type: "SAV — Fuite", client: "M. Bernard", time: "14:00", tech: "P. Roux" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre activité</p>
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
          value="3"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Projects pipeline mini */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Projets en cours</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {mockProjects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.client}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Today's interventions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agenda du jour</h2>
        <div className="space-y-2">
          {mockInterventions.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="font-mono text-sm font-medium text-accent w-12">{i.time}</div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{i.type}</p>
                <p className="text-xs text-muted-foreground">{i.client} — {i.tech}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
