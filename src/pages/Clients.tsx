import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Users, Mail, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useCustomers } from "@/hooks/useCustomers";
import { CustomerBadge } from "@/components/CustomerBadge";
import { CreateCustomerDialog } from "@/components/clients/CreateCustomerDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  active: "Client actif",
  inactive: "Inactif",
  archived: "Archivé",
};

export default function Clients() {
  const navigate = useNavigate();
  const { customers, loading, error, search, setSearch, refetch, createCustomer, creating } =
    useCustomers();

  if (error && !loading) {
    toast.error(error, { id: "clients-error" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Chargement…"
              : `${customers.length} client${customers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Réessayer
            </Button>
          )}
          <CreateCustomerDialog onSubmit={createCustomer} creating={creating} />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          {search.trim() ? (
            <p className="text-sm text-muted-foreground">
              Aucun client ne correspond à « {search} »
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                Aucun client pour le moment
              </p>
              <p className="text-xs text-muted-foreground">
                Créez votre premier client pour commencer.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 cursor-pointer hover:border-accent/20 transition-colors"
              onClick={() => navigate(`/clients/${customer.id}`)}
            >
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                {/* Name */}
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {customer.name}
                </span>

                {/* Type badge */}
                <CustomerBadge customerType={customer.customer_type} size="sm" />

                {/* Status */}
                <span className="text-xs text-muted-foreground shrink-0">
                  {STATUS_LABELS[customer.status] ?? customer.status}
                </span>

                {/* Contact info */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  {customer.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </span>
                  )}
                </div>

                {/* Date */}
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(customer.modified_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
