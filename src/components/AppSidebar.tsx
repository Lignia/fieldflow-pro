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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";

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
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (route: string) =>
    pathname === route ||
    (route !== "/dashboard" && pathname.startsWith(route + "/"));

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
    </Sidebar>
  );
}
