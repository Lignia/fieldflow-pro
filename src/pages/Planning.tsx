import { StatusBadge } from "@/components/StatusBadge";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Mock weekly planning aligned with SQL interventions ─── */
const weekDays = [
  { label: "Lun.", date: "18 mars", isToday: false },
  { label: "Mar.", date: "19 mars", isToday: false },
  { label: "Mer.", date: "20 mars", isToday: false },
  { label: "Jeu.", date: "21 mars", isToday: true },
  { label: "Ven.", date: "22 mars", isToday: false },
];

interface Intervention {
  id: number;
  label: string;
  type: "installation" | "ramonage" | "sav" | "visite_technique";
  client: string;
  address: string;
  time: string;
  duration: string;
  tech: string;
  status: string;
  priority?: "high";
}

const weekInterventions: Record<string, Intervention[]> = {
  "18 mars": [
    { id: 10, label: "Ramonage conduit maçonné", type: "ramonage", client: "M. Perrin", address: "44 rue du Port, Tulle", time: "09:00", duration: "1h", tech: "P. Roux", status: "completed" },
    { id: 11, label: "VT — faisabilité insert", type: "visite_technique", client: "Mme Faure", address: "ZA Les Vergnes, Ussel", time: "14:00", duration: "1h30", tech: "J. Morel", status: "completed" },
  ],
  "19 mars": [
    { id: 12, label: "Pose tubage inox Ø150 — suite", type: "installation", client: "M. Lemoine", address: "8 chemin du Puy, Guéret", time: "08:00", duration: "7h", tech: "J. Morel", status: "completed" },
    { id: 13, label: "Ramonage bi-annuel", type: "ramonage", client: "M. Moreau", address: "7 imp. du Moulin, Limoges", time: "10:00", duration: "1h", tech: "P. Roux", status: "completed" },
  ],
  "20 mars": [
    { id: 14, label: "Pose poêle Invicta Onsen", type: "installation", client: "M. Dupont", address: "12 rue des Acacias, Limoges", time: "08:00", duration: "6h", tech: "J. Morel", status: "completed" },
  ],
  "21 mars": [
    { id: 1, label: "Pose poêle + tubage — finition", type: "installation", client: "M. Lemoine", address: "8 chemin du Puy, Guéret", time: "08:00", duration: "6h", tech: "J. Morel", status: "in_progress" },
    { id: 2, label: "Ramonage annuel conduit inox", type: "ramonage", client: "Mme Petit", address: "8 av. de la Gare, Limoges", time: "09:00", duration: "1h", tech: "P. Roux", status: "scheduled" },
    { id: 3, label: "SAV — Fuite raccord fumisterie", type: "sav", client: "M. Bernard", address: "3 pl. du Marché, Brive", time: "14:00", duration: "2h", tech: "P. Roux", status: "scheduled", priority: "high" },
    { id: 4, label: "VT — Étude faisabilité insert", type: "visite_technique", client: "Mme Martin", address: "15 rue Voltaire, Brive", time: "16:30", duration: "1h30", tech: "J. Morel", status: "scheduled" },
  ],
  "22 mars": [
    { id: 5, label: "VT — Chaudière bois Morvan", type: "visite_technique", client: "M. Garcia", address: "5 imp. Châtaigniers, Tulle", time: "09:00", duration: "2h", tech: "J. Morel", status: "scheduled" },
    { id: 6, label: "Remplacement vitre insert", type: "sav", client: "M. Moreau", address: "7 imp. du Moulin, Limoges", time: "14:00", duration: "1h30", tech: "P. Roux", status: "scheduled" },
  ],
};

const typeColors: Record<string, string> = {
  installation: "border-l-accent bg-accent/[0.03]",
  ramonage: "border-l-blue-500 bg-blue-500/[0.03]",
  sav: "border-l-destructive bg-destructive/[0.02]",
  visite_technique: "border-l-amber-500 bg-amber-500/[0.03]",
};

const typeLabels: Record<string, string> = {
  installation: "Installation",
  ramonage: "Ramonage",
  sav: "SAV",
  visite_technique: "Visite technique",
};

const typeEmoji: Record<string, string> = {
  installation: "🔧",
  ramonage: "🧹",
  sav: "⚠️",
  visite_technique: "📋",
};

const techs = [
  { name: "J. Morel", color: "bg-accent text-accent-foreground" },
  { name: "P. Roux", color: "bg-blue-100 text-blue-700" },
];

export default function Planning() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Semaine du 18 au 22 mars 2024
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filtres
          </Button>
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Intervention</span>
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Sem. précédente
        </Button>
        <div className="flex items-center gap-2">
          {techs.map((t) => (
            <span key={t.name} className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.color}`}>
              {t.name}
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="gap-1">
          Sem. suivante <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-5 gap-3">
        {weekDays.map((day) => {
          const interventions = weekInterventions[day.date] || [];
          return (
            <div key={day.date} className="space-y-2">
              {/* Day header */}
              <div
                className={`text-center rounded-lg p-2 ${
                  day.isToday
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/50"
                }`}
              >
                <p className="text-xs font-medium">{day.label}</p>
                <p className={`text-sm font-semibold ${day.isToday ? "" : "text-foreground"}`}>
                  {day.date}
                </p>
              </div>

              {/* Intervention cards */}
              <div className="space-y-1.5 min-h-[120px]">
                {interventions.map((intv) => (
                  <div
                    key={intv.id}
                    className={`rounded-md border-l-[3px] border bg-card p-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs ${
                      typeColors[intv.type] || ""
                    } ${intv.priority === "high" ? "ring-1 ring-destructive/20" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-medium">{intv.time}</span>
                      <span className="text-muted-foreground">{intv.duration}</span>
                    </div>
                    <p className="font-medium leading-snug mb-1 line-clamp-2">
                      {intv.label}
                    </p>
                    <p className="text-muted-foreground truncate">{intv.client}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        techs.find((t) => t.name === intv.tech)?.color || "bg-muted text-muted-foreground"
                      }`}>
                        {intv.tech}
                      </span>
                      {intv.status === "completed" && (
                        <span className="text-[10px] text-accent">✓</span>
                      )}
                    </div>
                  </div>
                ))}
                {interventions.length === 0 && (
                  <div className="rounded-md border border-dashed bg-muted/10 p-4 text-center">
                    <p className="text-[10px] text-muted-foreground">Libre</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
        {Object.entries(typeLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span>{typeEmoji[key]}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
