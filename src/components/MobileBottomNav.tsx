import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarDays,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: LayoutDashboard, label: "Accueil", path: "/dashboard" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: FolderKanban, label: "Projets", path: "/projects" },
  { icon: CalendarDays, label: "Planning", path: "/planning" },
  { icon: Wrench, label: "SAV", path: "/service-requests" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 text-xs min-h-[52px] justify-center transition-colors",
                active
                  ? "text-accent font-medium"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
