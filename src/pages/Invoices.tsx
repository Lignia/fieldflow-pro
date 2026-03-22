import { Receipt } from "lucide-react";

export default function Invoices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Factures
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          En attente de connexion à la base de données
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Receipt className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">Les factures apparaîtront ici après connexion Supabase</p>
      </div>
    </div>
  );
}
