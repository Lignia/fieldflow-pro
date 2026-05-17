import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * LEGACY — Ce composant est désactivé en production.
 * La création de devis se fait exclusivement via QuoteEditor
 * accessible depuis la fiche projet (/projects/:id).
 *
 * Route : /quotes/new
 * Ne crée plus de devis, ne charge plus aucun client.
 */
export default function CreateQuote() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto mt-16 px-4">
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Ce flux n'est plus disponible</p>
              <p className="text-sm text-muted-foreground">
                La création de devis se fait depuis la fiche projet,
                afin de garantir la traçabilité catalogue, les snapshots
                fournisseur et le pricing contractuel.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/projects")} className="w-full">
              Aller aux projets <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/quotes")} className="w-full">
              Voir mes devis existants
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
