import { Wrench } from "lucide-react";

export default function ServiceRequests() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Demandes SAV
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          En attente de connexion à la base de données
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Wrench className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">Les demandes SAV apparaîtront ici après connexion Supabase</p>
      </div>
    </div>
  );
}
