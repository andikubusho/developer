import { Link, useLocation } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import { useBranch } from "@/hooks/use-branch";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getSuperMenus } from "@/pages/dashboard";
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  PackageSearch, 
  ClipboardCheck, 
  Send, 
  CheckCircle,
  FileCheck,
  UserCog,
  Building2,
  ChevronDown,
  History,
  Package,
  FileText,
  ClipboardList,
  ReceiptText,
  BadgePercent,
  Bookmark,
  PlusCircle,
  MapPin,
  Ticket,
  LayoutGrid,
  Star as StarIcon,
  Coins,
  Scissors,
  Database,
  Wallet,
} from "lucide-react";
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
  SidebarSeparator,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AppSidebar() {
  const [currentPath] = useLocation();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranch();
  const { t } = useSettings();

  const isCurrent = (path: string) => currentPath === path;
  
  const isAdmin = user?.authorizedDashboards?.includes('admin') || user?.username === 'admin' || false;
  const isSalesman = user?.authorizedDashboards?.includes('salesman') || false;
  const isPromo = user?.authorizedDashboards?.includes('promo') || false;
  

  const canAccessPromo = user?.id === 1 || user?.authorizedDashboards?.includes("promo_toko");

  const menus = getSuperMenus(can, isPromo, isAdmin, isSalesman);

  const groupedMenus = menus.reduce((acc: any, menu: any) => {
    if (!acc[menu.group]) acc[menu.group] = [];
    acc[menu.group].push(menu);
    return acc;
  }, {} as Record<string, typeof menus>);

  const getDashboardLabel = () => {
    const branchSuffix = selectedBranch ? ` (${selectedBranch.name})` : "";
    if (isAdmin) return `Admin${branchSuffix}`;
    if (isSalesman) return `Salesman${branchSuffix}`;
    if (isPromo) return `Promo${branchSuffix}`;
    return `Dashboard${branchSuffix}`;
  };

  return (
    <Sidebar variant="sidebar" className="border-r border-slate-200 bg-white pt-4">
      <SidebarHeader className="py-8 px-5">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                  <path d="M14 2L2 8L14 14L26 8L14 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 16L14 22L26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L14 18L26 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-slate-900 text-lg leading-tight tracking-tight uppercase">
                Pratama Jaya
              </span>
              <span className="text-[10px] font-extrabold text-primary/80 uppercase tracking-[0.2em]">
                & Ferio Motor
              </span>
            </div>
          </div>

          {selectedBranch && (
            <div className="px-1">
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10 shadow-sm transition-all hover:bg-primary/[0.08]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider leading-none">{t('sidebar_active_branch', 'Cabang Aktif')}</span>
                </div>
                
                <Select 
                  value={selectedBranchId?.toString()} 
                  onValueChange={(val) => setSelectedBranchId(parseInt(val))}
                >
                  <SelectTrigger className="h-9 px-2 bg-white/50 border-slate-200/60 hover:bg-white hover:border-primary/30 transition-all font-bold text-slate-800 text-sm rounded-lg focus:ring-primary/20">
                    <SelectValue placeholder={t('sidebar_branch_placeholder', 'Pilih Cabang')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()} className="rounded-lg py-2 font-medium cursor-pointer">
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Home Button ALWAYS at the top */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/70">{t('sidebar_group_main', 'Utama')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  data-active={currentPath === "/"} 
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-colors font-bold"
                >
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t('sidebar_home_label', 'Home Beranda')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Super Menus Matching the Icon Grid */}
        {Object.entries(groupedMenus).map(([groupName, groupItems]: [string, any]) => (
          <SidebarGroup key={groupName}>
            <SidebarGroupLabel className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/70">
              {groupName}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupItems.map((menu: any) => (
                  <SidebarMenuItem key={menu.id}>
                    <SidebarMenuButton 
                      asChild 
                      data-active={isCurrent(menu.path)} 
                      className={`transition-colors ${isCurrent(menu.path) ? "bg-primary/10 text-primary font-bold shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      <Link href={menu.path}>
                        <menu.icon className={`h-4 w-4 ${isCurrent(menu.path) ? "text-primary stroke-[2.5px]" : "text-slate-400"}`} />
                        <span>{menu.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-6 mt-auto border-t border-sidebar-border/20 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center gap-1.5 group cursor-default">
          <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-all duration-300">
            <div className="h-px w-4 bg-slate-300 group-hover:bg-primary/30" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">
              {t('sidebar_footer_tagline', 'Legacy System')}
            </span>
            <div className="h-px w-4 bg-slate-300 group-hover:bg-primary/30" />
          </div>
          <div className="flex flex-col items-center gap-0">
            <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
              {t('sidebar_footer_credit', 'create system and design by')}
            </span>
            <span className="text-[12px] font-black text-slate-500 group-hover:text-primary uppercase tracking-tight transition-all duration-300 group-hover:scale-105">
              {t('sidebar_footer_author', 'Andi ho')}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
