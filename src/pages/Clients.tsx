import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Users, Plus, RefreshCw, MoreHorizontal, FolderKanban, Wrench, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { useCustomers } from "@/hooks/useCustomers";
import { CustomerBadge } from "@/components/CustomerBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type StatusFilter = "all" | "prospect" | "active" | "archived";

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "prospect", label: "Prospects" },
  { key: "active", label: "Actifs" },
  { key: "archived", label: "Archivés" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  prospect: { label: "Prospect", className: "bg-muted text-muted-foreground" },
  active: { label: "Actif", className: "bg-accent/15 text-accent" },
  archived: { label: "Archivé", className: "bg-destructive/10 text-destructive" },
};

export default function Clients() {
  const navigate = useNavigate();
  const { customers, loading, error, search, setSearch, refetch } = useCustomers();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (error && !loading) {
    toast.error(error, { id: "clients-error" });
  }

  const filtered = useMemo(() => {
    if (statusFilter === "all") return customers;
    return customers.filter((c) => c.status === statusFilter);
  }, [customers, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Chargement…" : `${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Réessayer
            </Button>
          )}
          <Button size="sm" onClick={() => navigate("/clients/new")}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau client
          </Button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          {search.trim() || statusFilter !== "all" ? (
            <p className="text-sm text-muted-foreground">Aucun client ne correspond aux critères.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">Aucun client pour l'instant.</p>
              <p className="text-xs text-muted-foreground mb-4">Ajoutez votre premier client pour commencer.</p>
              <Button size="sm" onClick={() => navigate("/clients/new")}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau client
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden sm:table-cell">Dernière activité</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const badge = STATUS_BADGE[c.status] ?? { label: c.status, className: "bg-muted text-muted-foreground" };
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <CustomerBadge customerType={c.customer_type} size="sm" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="h-3 w-3" /> {c.email}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" /> {c.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.modified_at), { addSuffix: true, locale: fr })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${c.id}`)}>
                            Voir la fiche
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/projects/new?customer=${c.id}`)}>
                            <FolderKanban className="h-3.5 w-3.5 mr-2" /> Nouveau projet
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/service-requests/new?customer=${c.id}`)}>
                            <Wrench className="h-3.5 w-3.5 mr-2" /> Demande SAV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
