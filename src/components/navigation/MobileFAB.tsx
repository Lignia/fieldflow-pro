import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Wrench, AlertTriangle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileFAB() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const actions = [
    {
      label: "Démarrer une intervention",
      icon: Wrench,
      onClick: () => { setOpen(false); navigate("/interventions/new"); },
    },
    {
      label: "Signaler un problème",
      icon: AlertTriangle,
      onClick: () => { setOpen(false); navigate("/service-requests/new"); },
    },
    {
      label: "Prendre une photo",
      icon: Camera,
      onClick: () => { setOpen(false); /* future */ },
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Actions rapides</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 mt-4 pb-4">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="justify-start gap-3 h-12"
                onClick={action.onClick}
              >
                <action.icon className="h-5 w-5 text-muted-foreground" />
                {action.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
