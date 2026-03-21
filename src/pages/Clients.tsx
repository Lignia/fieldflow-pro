import { StatusBadge } from "@/components/StatusBadge";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockClients = [
  {
    id: 1,
    type: "particulier" as const,
    firstName: "Pierre",
    lastName: "Dupont",
    email: "p.dupont@orange.fr",
    phone: "06 12 34 56 78",
    city: "Limoges",
    address: "12 rue des Acacias, 87000 Limoges",
    projectCount: 2,
    lastProject: "Poêle Invicta Onsen",
    lastProjectStatus: "installation_scheduled",
    tags: ["MaPrimeRénov'", "Chauffage bois"],
    createdAt: "12 janv. 2024",
  },
  {
    id: 2,
    type: "particulier" as const,
    firstName: "Claire",
    lastName: "Martin",
    email: "c.martin@gmail.com",
    phone: "06 98 76 54 32",
    city: "Brive-la-Gaillarde",
    address: "15 rue Voltaire, 19100 Brive",
    projectCount: 1,
    lastProject: "Insert Jøtul I520",
    lastProjectStatus: "quote_sent",
    tags: ["Insert"],
    createdAt: "3 fév. 2024",
  },
  {
    id: 3,
    type: "particulier" as const,
    firstName: "Alain",
    lastName: "Garcia",
    email: "a.garcia@sfr.fr",
    phone: "07 22 33 44 55",
    city: "Tulle",
    address: "5 impasse des Châtaigniers, 19000 Tulle",
    projectCount: 1,
    lastProject: "Chaudière bois Morvan MH 22",
    lastProjectStatus: "survey_scheduled",
    tags: ["Chaudière"],
    createdAt: "15 fév. 2024",
  },
  {
    id: 4,
    type: "particulier" as const,
    firstName: "Henri",
    lastName: "Lemoine",
    email: "h.lemoine@laposte.net",
    phone: "06 55 44 33 22",
    city: "Guéret",
    address: "8 chemin du Puy, 23000 Guéret",
    projectCount: 1,
    lastProject: "Tubage inox Ø150 — 8m",
    lastProjectStatus: "installation_in_progress",
    tags: ["Tubage", "Fumisterie"],
    createdAt: "22 fév. 2024",
  },
  {
    id: 5,
    type: "professionnel" as const,
    firstName: "Sophie",
    lastName: "Faure",
    email: "s.faure@entreprise-faure.fr",
    phone: "05 55 12 34 56",
    city: "Ussel",
    address: "ZA Les Vergnes, 19200 Ussel",
    projectCount: 3,
    lastProject: "Poêle granulés MCZ Ego Air",
    lastProjectStatus: "lead_qualified",
    tags: ["Pro", "Granulés"],
    createdAt: "8 janv. 2024",
  },
  {
    id: 6,
    type: "particulier" as const,
    firstName: "Michel",
    lastName: "Vidal",
    email: "m.vidal@free.fr",
    phone: "06 11 22 33 44",
    city: "Limoges",
    address: "22 bd Gambetta, 87000 Limoges",
    projectCount: 1,
    lastProject: "Ramonage annuel",
    lastProjectStatus: "project_closed",
    tags: ["SAV", "Ramonage"],
    createdAt: "5 nov. 2023",
  },
];

export default function Clients() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockClients.length} clients · 2 villes principales
          </p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau client</span>
        </Button>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client…"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </Button>
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {mockClients.map((client) => (
          <div
            key={client.id}
            className="group flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/20 cursor-pointer"
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold text-sm">
              {client.firstName[0]}{client.lastName[0]}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm group-hover:text-accent transition-colors">
                  {client.type === "professionnel" ? "Ets " : client.firstName.charAt(0) === "C" || client.firstName.charAt(0) === "S" ? "Mme " : "M. "}
                  {client.firstName} {client.lastName}
                </p>
                {client.type === "professionnel" && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent uppercase tracking-wide">
                    Pro
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {client.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {client.phone}
                </span>
                <span className="inline-flex items-center gap-1 hidden sm:flex">
                  <Mail className="h-3 w-3" /> {client.email}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              {client.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Last project */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="h-3 w-3" />
                  {client.projectCount} projet{client.projectCount > 1 ? "s" : ""}
                </p>
                <StatusBadge status={client.lastProjectStatus} className="mt-1" />
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-accent transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}
