import { Home, Package, ShieldAlert, ShoppingBag, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useActiveTab } from "@/hooks/use-active-tab";
import { usePermissions } from "@/hooks/use-permissions";
import { getSuperMenus } from "@/pages/dashboard";
import { useSettings } from "@/hooks/use-settings";

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { can } = usePermissions();
  const activeTab = useActiveTab();
  const { t } = useSettings();
  
  const isAdmin = !!(user?.authorizedDashboards?.includes('admin') || user?.username === 'admin');
  const isSalesman = !!user?.authorizedDashboards?.includes('salesman');
  const isPromo = !!(user?.authorizedDashboards?.includes('promo') || user?.authorizedDashboards?.includes('promo_toko'));

  const menus = getSuperMenus(can, isPromo, isAdmin, isSalesman);
  
  // Everyone sees home
  const navItems = [
    { id: 'home', icon: Home, label: t('tab_home', "Home"), path: "/" },
  ];

  // Dynamically show tabs based on menu group availability
  if (menus.some(m => m.group === 'Sales & Data')) {
    navItems.push({ id: 'sales', icon: ShoppingBag, label: t('tab_sales', "Sales"), path: "/?tab=sales" });
  }
  
  if (menus.some(m => m.group === 'Operasional')) {
    navItems.push({ id: 'gudang', icon: Package, label: t('tab_gudang', "Gudang"), path: "/?tab=gudang" });
  }
  
  if (menus.some(m => m.group === 'Promo & Loyalti')) {
    navItems.push({ id: 'promo', icon: Tag, label: t('tab_promo', "Promo"), path: "/?tab=promo" });
  }
  
  if (menus.some(m => m.group === 'Sistem')) {
    navItems.push({ id: 'admin', icon: ShieldAlert, label: t('tab_admin', "Admin"), path: "/?tab=admin" });
  }

  // Use the reactive activeTab from hook
  const isHome = location === "/";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center z-[100] shadow-[0_-10px_50px_rgba(0,0,0,0.12)] px-2 sm:px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const Icon = item.icon;
        // active if we are on root and tab matches, OR if we are on a subpath and item path matches
        const isActive = isHome ? (activeTab === item.id) : (location.startsWith(item.path) && item.id !== 'home');
        
        return (
          <Link key={item.label} href={item.path} className={`flex flex-col items-center gap-1 min-w-[56px] transition-all duration-300 transform active:scale-95 ${isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <div className={`relative p-2.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-primary/20 to-indigo-500/10 shadow-inner' : 'bg-transparent'}`}>
              <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'stroke-[2.5px] text-primary' : 'stroke-[1.5px] text-slate-400'}`} />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <span className={`text-[9px] font-black tracking-widest uppercase mt-0.5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
