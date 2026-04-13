import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { Link } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, MapPin, ChevronLeft } from "lucide-react";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import { useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const { t } = useSettings();
  const logoutMut = useLogout();

  const style = {
    "--sidebar-width": "250px",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const [location, setLocation] = useLocation();
  const isHome = location === "/";

  return (
    <SidebarProvider style={style}>
      <div className="flex h-[100dvh] w-full bg-[#fafbfc] relative overflow-hidden">

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none"></div>
        
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 relative z-10">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6 subtle-shadow">
            {!isHome && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-slate-100/50 hover:bg-slate-200/50 transition-colors md:hidden"
                onClick={() => {
                  if (location.startsWith("/salesman/") || location.startsWith("/master/")) setLocation("/?tab=sales");
                  else if (location.startsWith("/pengiriman/") || location.startsWith("/pengembalian/")) setLocation("/?tab=gudang");
                  else if (location.startsWith("/promo/")) setLocation("/?tab=promo");
                  else if (location.startsWith("/admin/")) setLocation("/?tab=admin");
                  else setLocation("/");
                }}
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </Button>
            )}
            <SidebarTrigger className="hover-elevate -ml-2 hidden md:flex" />
            {!isHome && (
              <Button
                variant="ghost"
                className="hidden md:flex items-center gap-1 h-9 px-3 rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => {
                  if (location.startsWith("/salesman/") || location.startsWith("/master/")) setLocation("/?tab=sales");
                  else if (location.startsWith("/pengiriman/") || location.startsWith("/pengembalian/")) setLocation("/?tab=gudang");
                  else if (location.startsWith("/promo/")) setLocation("/?tab=promo");
                  else if (location.startsWith("/admin/")) setLocation("/?tab=admin");
                  else setLocation("/");
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm font-bold">Kembali</span>
              </Button>
            )}
            <div className="flex items-center gap-2 ml-2 sm:ml-4">
              {selectedBranch && (
                <Link href="/role-selection">
                  <a className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/20 transition-all cursor-pointer group active:scale-95">
                    <MapPin className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-700 hidden xs:inline-block">
                      {selectedBranch.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 xs:hidden">
                      {selectedBranch.name}
                    </span>
                  </a>
                </Link>
              )}
            </div>
            <div className="flex-1"></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-9 px-2 hover:bg-slate-100"
                  data-testid="btn-user-menu"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">
                    {user?.displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="btn-logout"
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={() => logoutMut.mutate()}
                  disabled={logoutMut.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {logoutMut.isPending ? `${t('button_logout', 'Keluar')}...` : t('button_logout', 'Keluar')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-auto pb-24 md:pb-6">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
