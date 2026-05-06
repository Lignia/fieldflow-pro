import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarDays,
  FileText,
  Receipt,
  ClipboardList,
  Wrench,
  Flame,
  Package,
  Percent,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { SearchGlobal } from "@/components/SearchGlobal";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase, setPersistSession } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/format";

const navSections = [
  {
    label: "Principal",
    items: [
      { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
      { title: "Clients", url: "/clients", icon: Users },
      { title: "Projets", url: "/projects", icon: FolderKanban },
      { title: "Planning", url: "/planning", icon: CalendarDays },
    ],
  },
  {
    label: "Ventes",
    items: [
      { title: "Devis", url: "/quotes", icon: FileText },
      { title: "Factures", url: "/invoices", icon: Receipt },
    ],
  },
  {
    label: "SAV",
    items: [
      { title: "Demandes", url: "/service-requests", icon: ClipboardList },
      { title: "Interventions", url: "/interventions", icon: Wrench },
    ],
  },
  {
    label: "Parc",
    items: [
      { title: "Installations", url: "/installations", icon: Flame },
    ],
  },
  {
    label: "Outils",
    items: [
      { title: "Catalogue", url: "/catalog", icon: Package },
      { title: "Conditions d'achat", url: "/settings/supplier-discounts", icon: Percent },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();

  const displayName = toTitleCase((coreUser?.full_name as string) ?? "Utilisateur");

  const isActive = (route: string) =>
    pathname === route ||
    (route !== "/dashboard" && pathname.startsWith(route + "/"));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setPersistSession(true);
    navigate("/auth/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold text-sm">
            L
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              LIGNIA
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SearchGlobal variant="sidebar" />

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3 px-1">
          <UserAvatar name={displayName} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              {coreUser ? (
                <>
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {coreUser.email}
                  </p>
                </>
              ) : (
                <>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              )}
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full mt-2 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
