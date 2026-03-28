import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileFAB } from "@/components/navigation/MobileFAB";
import { AppBreadcrumb } from "@/components/navigation/AppBreadcrumb";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import { Outlet, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/format";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout() {
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const displayName = toTitleCase(coreUser?.full_name ?? "Utilisateur");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' && (
            <div className="bg-destructive text-destructive-foreground text-center text-xs font-semibold py-1 tracking-wide">
              MODE DÉVELOPPEMENT — Auth désactivée
            </div>
          )}
          <header className="sticky top-0 z-40 h-14 flex items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="hidden md:flex" />
            <div className="md:hidden flex items-center gap-2">
              <SidebarTrigger />
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground font-bold text-xs">
                L
              </div>
              <span className="text-base font-bold tracking-tight">LIGNIA</span>
            </div>
            <div className="hidden md:flex">
              <AppBreadcrumb />
            </div>

            {/* Mobile user menu — right side */}
            <div className="md:hidden ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <UserAvatar name={displayName} size="sm" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{displayName}</p>
                    {coreUser?.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {coreUser.email}
                      </p>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>

        <MobileBottomNav />
        <MobileFAB />
      </div>
    </SidebarProvider>
  );
}
