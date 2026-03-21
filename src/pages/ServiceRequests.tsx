import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Wrench,
  Phone,
  Calendar,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─── Mock SAV aligned with SQL service_requests + interventions ─── */
const mockSAV = [
  {
    id: 1,
    ref: "SAV-2024-0023",
    type: "reparation" as const,
    priority: "high" as const,
    subject: "Fuite raccord fumisterie — odeur de fumée",
    client: "M. Bernard",
    phone: "06 33 44 55 66",
    address: "3 pl. du Marché, 19100 Brive",
    equipment: "Insert Jøtul I18",
    status: "qualified",
    createdAt: "19 mars 2024",
    scheduledDate: "21 mars 2024",
    tech: "P. Roux",
  },
  {
    id: 2,
    ref: "SAV-2024-0022",
    type: "ramonage" as const,
    priority: "normal" as const,
    subject: "Ramonage annuel — conduit inox Ø150",
    client: "Mme Petit",
    phone: "06 77 88 99 00",
    address: "8 av. de la Gare, 87000 Limoges",
    equipment: "Poêle Invicta Symphonia",
    status: "planned",
    createdAt: "15 mars 2024",
    scheduledDate: "21 mars 2024",
    tech: "P. Roux",
  },
  {
    id: 3,
    ref: "SAV-2024-0021",
    type: "diagnostic" as const,
    priority: "high" as const,
    subject: "Poêle granulés ne démarre plus — erreur E03",
    client: "Mme Duval",
    phone: "07 11 22 33 44",
    address: "14 rue des Tilleuls, 19000 Tulle",
    equipment: "MCZ Ego Air 8 M1",
    status: "new",
    createdAt: "20 mars 2024",
    scheduledDate: null,
    tech: null,
  },
  {
    id: 4,
    ref: "SAV-2024-0020",
    type: "reparation" as const,
    priority: "normal" as const,
    subject: "Vitre fissurée — remplacement",
    client: "M. Moreau",
    phone: "06 55 66 77 88",
    address: "7 impasse du Moulin, 87000 Limoges",
    equipment: "Insert Stûv 16-H",
    status: "planned",
    createdAt: "12 mars 2024",
    scheduledDate: "24 mars 2024",
    tech: "J. Morel",
  },
  {
    id: 5,
    ref: "SAV-2024-0019",
    type: "mise_en_conformite" as const,
    priority: "normal" as const,
    subject: "Distance sécurité non conforme — mur mitoyen",
    client: "M. Lefèvre",
    phone: "06 99 88 77 66",
    address: "22 rue de la Paix, 23000 Guéret",
    equipment: "Poêle Godin 3144",
    status: "closed",
    createdAt: "5 mars 2024",
    scheduledDate: "8 mars 2024",
    closedAt: "8 mars 2024",
    tech: "J. Morel",
  },
];

const typeLabels: Record<string, { label: string; icon: string }> = {
  reparation: { label: "Réparation", icon: "🔧" },
  ramonage: { label: "Ramonage", icon: "🧹" },
  diagnostic: { label: "Diagnostic", icon: "🔍" },
  mise_en_conformite: { label: "Conformité", icon: "📐" },
};

const priorityStyles: Record<string, string> = {
  high: "border-destructive/30 bg-destructive/[0.02]",
  normal: "",
};

const stats = {
  new: mockSAV.filter((s) => s.status === "new").length,
  qualified: mockSAV.filter((s) => s.status === "qualified").length,
  planned: mockSAV.filter((s) => s.status === "planned").length,
  highPriority: mockSAV.filter((s) => s.priority === "high" && s.status !== "closed").length,
};

export default function ServiceRequests() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Demandes SAV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ramonages, réparations, diagnostics et mises en conformité
          </p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle demande</span>
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Nouvelles</p>
          <p className="text-xl font-bold font-mono mt-1">{stats.new}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Qualifiées</p>
          <p className="text-xl font-bold font-mono mt-1">{stats.qualified}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5 shadow-sm">
          <p className="text-xs text-muted-foreground">Planifiées</p>
          <p className="text-xl font-bold font-mono mt-1">{stats.planned}</p>
        </div>
        <div className="rounded-lg border bg-card p-3.5 shadow-sm flex items-center gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Urgentes</p>
            <p className="text-xl font-bold font-mono mt-1 text-destructive">{stats.highPriority}</p>
          </div>
          {stats.highPriority > 0 && <Flame className="h-5 w-5 text-destructive/60 ml-auto" />}
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une demande SAV…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </Button>
      </div>

      {/* SAV list */}
      <div className="space-y-2">
        {mockSAV.map((sav) => {
          const typeInfo = typeLabels[sav.type] || { label: sav.type, icon: "📌" };
          return (
            <div
              key={sav.id}
              className={`group flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/20 cursor-pointer ${
                priorityStyles[sav.priority] || ""
              }`}
            >
              {/* Type icon */}
              <div className="text-xl shrink-0 pt-0.5">{typeInfo.icon}</div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm group-hover:text-accent transition-colors">
                      {sav.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-muted-foreground">{sav.ref}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {typeInfo.label}
                      </span>
                      {sav.priority === "high" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium flex items-center gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Urgent
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={sav.status} className="shrink-0" />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span>{sav.client}</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {sav.phone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> {sav.equipment}
                  </span>
                  {sav.scheduledDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {sav.scheduledDate}
                    </span>
                  )}
                  {sav.tech && <span>→ {sav.tech}</span>}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-accent transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
