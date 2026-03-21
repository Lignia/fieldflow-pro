import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── Pipeline columns matching SQL project_status enum ─── */
const pipelineColumns = [
  {
    key: "prospection",
    label: "Prospection",
    color: "bg-blue-500",
    statuses: ["lead_new", "lead_qualified"],
  },
  {
    key: "etude",
    label: "Étude",
    color: "bg-amber-500",
    statuses: ["survey_scheduled", "survey_completed"],
  },
  {
    key: "devis",
    label: "Devis",
    color: "bg-orange-500",
    statuses: ["quote_pending", "quote_sent", "quote_signed"],
  },
  {
    key: "installation",
    label: "Installation",
    color: "bg-accent",
    statuses: ["installation_scheduled", "installation_in_progress", "installation_completed"],
  },
  {
    key: "cloture",
    label: "Clôturé",
    color: "bg-muted-foreground",
    statuses: ["project_closed"],
  },
];

const mockProjects = [
  {
    id: 1,
    ref: "PRJ-2024-0047",
    name: "Poêle à bois Invicta Onsen",
    status: "installation_scheduled",
    client: "M. Dupont",
    city: "Limoges",
    amount: 4850,
    date: "28 mars",
    type: "poele_bois",
  },
  {
    id: 2,
    ref: "PRJ-2024-0046",
    name: "Insert Jøtul I520",
    status: "quote_sent",
    client: "Mme Martin",
    city: "Brive",
    amount: 6200,
    date: "25 mars",
    type: "insert",
  },
  {
    id: 3,
    ref: "PRJ-2024-0045",
    name: "Chaudière bois Morvan MH 22",
    status: "survey_scheduled",
    client: "M. Garcia",
    city: "Tulle",
    amount: null,
    date: "22 mars",
    type: "chaudiere_bois",
  },
  {
    id: 4,
    ref: "PRJ-2024-0044",
    name: "Tubage inox Ø150 — 8m",
    status: "installation_in_progress",
    client: "M. Lemoine",
    city: "Guéret",
    amount: 3100,
    date: "21 mars",
    type: "tubage",
  },
  {
    id: 5,
    ref: "PRJ-2024-0043",
    name: "Poêle granulés MCZ Ego Air",
    status: "lead_qualified",
    client: "Mme Faure",
    city: "Ussel",
    amount: null,
    date: "30 mars",
    type: "poele_granules",
  },
  {
    id: 6,
    ref: "PRJ-2024-0042",
    name: "Insert Stûv 16-H",
    status: "quote_pending",
    client: "M. Roche",
    city: "Limoges",
    amount: 7800,
    date: "18 mars",
    type: "insert",
  },
  {
    id: 7,
    ref: "PRJ-2024-0041",
    name: "Poêle Scan 68",
    status: "installation_completed",
    client: "Mme Laurent",
    city: "Brive",
    amount: 5400,
    date: "10 mars",
    type: "poele_bois",
  },
  {
    id: 8,
    ref: "PRJ-2024-0040",
    name: "Chaudière granulés Ökofen",
    status: "lead_new",
    client: "M. Perrin",
    city: "Tulle",
    amount: null,
    date: "20 mars",
    type: "chaudiere_granules",
  },
  {
    id: 9,
    ref: "PRJ-2024-0039",
    name: "Ramonage + Mise en conformité",
    status: "project_closed",
    client: "Mme Petit",
    city: "Limoges",
    amount: 380,
    date: "2 mars",
    type: "fumisterie",
  },
];

function getProjectsForColumn(statuses: string[]) {
  return mockProjects.filter((p) => statuses.includes(p.status));
}

export default function Projects() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Projets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockProjects.length} projets · Pipeline de 17 statuts
          </p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau projet</span>
        </Button>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un projet…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </Button>
      </div>

      {/* Kanban Pipeline */}
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-4 min-w-max">
          {pipelineColumns.map((col) => {
            const projects = getProjectsForColumn(col.statuses);
            return (
              <div key={col.key} className="w-64 shrink-0">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-2 w-2 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="text-xs text-muted-foreground ml-auto font-mono">
                    {projects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {projects.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                      <p className="text-xs text-muted-foreground">Aucun projet</p>
                    </div>
                  )}
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border bg-card p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-accent/20"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium leading-snug group-hover:text-accent transition-colors">
                          {p.name}
                        </p>
                      </div>
                      <StatusBadge status={p.status} className="mb-2" />
                      <div className="space-y-1 mt-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {p.client}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.city}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {p.date}
                        </p>
                      </div>
                      {p.amount && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm font-mono font-semibold text-right">
                            {p.amount.toLocaleString("fr-FR")} €
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-3">
        {pipelineColumns.map((col, i) => {
          const count = getProjectsForColumn(col.statuses).length;
          const pct = Math.round((count / mockProjects.length) * 100);
          return (
            <div key={col.key} className="flex items-center">
              {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-1.5" />}
              <div className="text-center">
                <div className={`h-1.5 rounded-full ${col.color} mx-auto mb-1`} style={{ width: `${Math.max(pct * 1.2, 16)}px` }} />
                <p className="text-[10px] text-muted-foreground font-medium">{col.label}</p>
                <p className="text-xs font-semibold font-mono">{count}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
