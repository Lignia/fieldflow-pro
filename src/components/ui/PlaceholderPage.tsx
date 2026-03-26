import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
}

export function PlaceholderPage({
  title,
  description = "Cette section est en cours de construction",
  backTo,
  backLabel,
}: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
      <Construction className="h-10 w-10 opacity-30" />
      <div className="text-center">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm mt-1">{description}</p>
      </div>
      {backTo && (
        <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          {backLabel ?? "Retour"}
        </Button>
      )}
    </div>
  );
}
