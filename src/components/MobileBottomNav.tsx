import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isActiveRoute } from "@/lib/nav";

const tabs = [
  { icon: LayoutDashboard, label: "Accueil", path: "/dashboard" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: FolderKanban, label: "Projets", path: "/projects" },
  { icon: FileText, label: "Devis", path: "/quotes" },
  { icon: Receipt, label: "Factures", path: "/invoices" },
  // TODO: activer quand module prêt
  // { icon: CalendarDays, label: "Planning", path: "/planning" },
  // TODO: activer quand module prêt
  // { icon: Wrench, label: "SAV", path: "/service-requests" },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();

  // Sur les pages de détail avec action FSM, la sticky action bar
  // remplace la MobileBottomNav (l'action métier prime sur la nav globale).
  // Note : startsWith('/projects/') ne matche PAS '/projects' (liste) car
  // la route liste n'a pas de slash final.
  const DETAIL_ROUTES = ['/projects/', '/quotes/', '/installations/'];
  const onDetailPage = DETAIL_ROUTES.some((r) => pathname.startsWith(r));
  if (onDetailPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-3 text-xs min-h-[52px] justify-center transition-colors",
              isActiveRoute(pathname, tab.path) ? "text-accent font-medium" : "text-muted-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
