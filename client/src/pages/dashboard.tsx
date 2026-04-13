import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useShipments } from "@/hooks/use-shipments";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGlobalPeriod } from "@/hooks/use-global-period";
import {
  PackageSearch, ClipboardCheck, Truck, CheckCircle, Clock, Box, MapPin, Receipt, Package, FileCheck, CircleCheckBig,
  TrendingUp, Users, ShoppingBag, Send, Star, Tag, Database, ClipboardList, Scissors, UserCog, History, Bookmark, LayoutGrid, Building2, Ticket, Settings, FileText, BadgePercent,
  PlusCircle, Wallet, Calendar 
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn, safeFormat } from "@/lib/utils";
import { useActiveTab } from "@/hooks/use-active-tab";
import { useSettings } from "@/hooks/use-settings";

export const getSuperMenus = (can: any, isPromo: boolean, isAdmin: boolean, isSalesman: boolean) => {
  const menus = [];

  // 1. Operasional
  if (can("input_pengiriman", "view")) menus.push({ id: 'input_pengiriman', group: 'Operasional', label: 'Input Pengiriman', icon: PackageSearch, color: 'from-blue-500 to-cyan-400', path: '/pengiriman/input' });
  if (can("packing", "view")) menus.push({ id: 'packing', group: 'Operasional', label: 'Verifikasi & Packing', icon: ClipboardCheck, color: 'from-orange-500 to-amber-400', path: '/pengiriman/verifikasi' });
  if (can("siap_kirim", "view")) menus.push({ id: 'siap_kirim', group: 'Operasional', label: 'Jadwal Kirim', icon: Send, color: 'from-indigo-500 to-blue-400', path: '/pengiriman/siap-kirim' });
  if (can("terkirim", "view")) menus.push({ id: 'kiriman_selesai', group: 'Operasional', label: 'Kiriman Selesai', icon: CircleCheckBig, color: 'from-green-500 to-emerald-400', path: '/kiriman-selesai' });
  if (can("pengembalian", "view")) menus.push({ id: 'pengembalian', group: 'Operasional', label: 'Faktur Kembali', icon: FileCheck, color: 'from-teal-500 to-emerald-400', path: '/pengembalian/faktur' });
  if (can("terkirim", "view")) menus.push({ id: 'terkirim', group: 'Operasional', label: 'Riwayat Faktur', icon: CheckCircle, color: 'from-emerald-500 to-teal-400', path: '/pengiriman/terkirim' });
  if (can("laporan_pengiriman", "view")) menus.push({ id: 'laporan_pengiriman', group: 'Operasional', label: 'Laporan Kirim', icon: ClipboardList, color: 'from-indigo-600 to-blue-500', path: '/reports/shipments' });
  if (can("master_ekspedisi", "view")) menus.push({ id: 'expeditions', group: 'Operasional', label: 'Ekspedisi', icon: Truck, color: 'from-rose-500 to-pink-400', path: '/master/expeditions' });

  // 2. Sales / Data
  if (isSalesman && can("surat_order", "view")) menus.push({ id: 'surat_order', group: 'Sales & Data', label: 'Surat Order', icon: ClipboardList, color: 'from-blue-600 to-indigo-500', path: '/salesman/orders' });
  if (isSalesman || isAdmin || can("cek_stock", "view")) menus.push({ id: 'cek_stock', group: 'Sales & Data', label: 'Cek Stock', icon: Package, color: 'from-emerald-600 to-teal-500', path: '/salesman/stock' });
  if (isAdmin || can("master_barang", "view")) menus.push({ id: 'master_barang', group: 'Sales & Data', label: 'Master Barang', icon: Box, color: 'from-amber-500 to-orange-400', path: '/master/items' });
  if (can("laporan_surat_order", "view")) menus.push({ id: 'laporan_surat_order', group: 'Sales & Data', label: 'Laporan SO', icon: FileText, color: 'from-blue-700 to-indigo-600', path: '/reports/orders' });
  if (can("master_pelanggan", "view") || can("master_customer_sales", "view")) {
    menus.push({ id: 'customers_op', group: 'Operasional', label: 'Pelanggan', icon: Users, color: 'from-cyan-500 to-blue-400', path: '/master/customers' });
    menus.push({ id: 'customers_sales', group: 'Sales & Data', label: 'Pelanggan', icon: Users, color: 'from-cyan-500 to-blue-400', path: '/master/customers' });
  }

  // 3. Promo Utama (Principal)

  if (can("klaim_principal", "view")) menus.push({ id: 'klaim_principal', group: 'Promo Utama', label: 'Klaim Principal', icon: FileText, color: 'from-orange-600 to-amber-600', path: '/promo/principal-claim' });
  if (can("master_principal", "view")) menus.push({ id: 'master_principal_data', group: 'Promo Utama', label: 'Data Principal', icon: Building2, color: 'from-slate-600 to-slate-400', path: '/master/principals' });

  // 4. Promo Terintegrasi (System)
  if (can("transaksi_promo", "view")) menus.push({ id: 'promo_integrated_transaksi', group: 'Promo Terintegrasi', label: 'Input Transaksi', icon: PlusCircle, color: 'from-blue-600 to-indigo-600', path: '/promo/integrated/transaksi' });
  if (can("monitoring_promo", "view")) menus.push({ id: 'promo_integrated_monitoring', group: 'Promo Terintegrasi', label: 'Monitoring Promo', icon: LayoutGrid, color: 'from-purple-600 to-pink-600', path: '/promo/integrated/monitoring' });
  if (can("pencairan_promo", "view")) menus.push({ id: 'promo_integrated_pencairan', group: 'Promo Terintegrasi', label: 'Pencairan', icon: Wallet, color: 'from-emerald-600 to-teal-600', path: '/promo/integrated/pencairan' });
  if (can("master_promo_integrated", "view")) menus.push({ id: 'promo_integrated_master', group: 'Promo Terintegrasi', label: 'Master Data', icon: Database, color: 'from-slate-600 to-slate-400', path: '/promo/integrated/master' });
  if (can("master_merek_promo", "view")) menus.push({ id: 'promo_integrated_brands', group: 'Promo Terintegrasi', label: 'Master Merek', icon: Bookmark, color: 'from-amber-600 to-orange-600', path: '/promo/brands' });
  if (can("program_pelanggan", "view")) menus.push({ id: 'promo_integrated_program_pelanggan', group: 'Promo Terintegrasi', label: 'Program Pelanggan', icon: Users, color: 'from-blue-500 to-cyan-400', path: '/promo/integrated/pelanggan' });

  // 5. Sistem & Admin
  if (isAdmin && can("master_cabang", "view")) menus.push({ id: 'branches', group: 'Sistem', label: 'Cabang', icon: Building2, color: 'from-slate-700 to-slate-500', path: '/admin/branches' });
  if (isAdmin && can("master_user", "view")) menus.push({ id: 'users', group: 'Sistem', label: 'Manajemen User', icon: UserCog, color: 'from-slate-800 to-slate-600', path: '/admin/users' });
  if (isAdmin && can("master_role", "view")) menus.push({ id: 'roles', group: 'Sistem', label: 'Atur Role', icon: Database, color: 'from-gray-600 to-gray-400', path: '/admin/roles' });
  if (isAdmin && (can("audit_logs", "view") || can("audit", "view") || can("master_user", "view"))) menus.push({ id: 'audit', group: 'Sistem', label: 'Log Aktivitas', icon: History, color: 'from-stone-500 to-stone-400', path: '/admin/audit-logs' });
  if (isAdmin && can("pengaturan_teks", "view")) menus.push({ id: 'settings_text', group: 'Sistem', label: 'Setting Teks', icon: Settings, color: 'from-gray-500 to-slate-500', path: '/admin/settings-text' });

  return menus;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { selectedBranch } = useBranch();
  const { t } = useSettings();
  const { globalMonth, globalYear, setGlobalMonth, setGlobalYear, isCurrentMonth, startDate: globalStartDate, endDate: globalEndDate } = useGlobalPeriod();
  
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  
  const username = user?.username?.toLowerCase() || '';
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = !!(
    user?.authorizedDashboards?.some(d => ['admin', 'superadmin', 'root'].includes(d.toLowerCase())) || 
    username.includes('admin') || 
    username.includes('super') || 
    username.includes('root') || 
    userRole.includes('admin') || 
    userRole.includes('super') ||
    userRole.includes('root')
  );
  const isSalesman = !!user?.authorizedDashboards?.includes('salesman');
  const isSalesRole = user?.role?.toLowerCase() === 'sales';
  const shouldFilterBySalesman = isSalesRole && !isAdmin;
  const isPromo = !!(user?.authorizedDashboards?.includes('promo') || user?.authorizedDashboards?.includes('promo_toko'));

  const menus = getSuperMenus(can, isPromo, isAdmin, isSalesman);

  const activeTab = useActiveTab();
  const [statusFilter, setStatusFilter] = useState<string>('semua');

  const { data: salesStats } = useQuery<{ totalRevenueMonth: number, pendingOrdersCount: number }>({
    queryKey: ["/api/sales/stats", selectedBranch?.id, shouldFilterBySalesman ? user?.id : null, globalStartDate, globalEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch?.id) params.append("branchId", selectedBranch.id.toString());
      if (shouldFilterBySalesman) params.append("salesmanId", user?.id.toString() || "");
      params.append("startDate", globalStartDate.toISOString());
      params.append("endDate", globalEndDate.toISOString());
      
      const url = `/api/sales/stats?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil statistik");
      return res.json();
    }
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery<{ shipments: any, recentActivities: any[] }>({
    queryKey: ["/api/stats/summary", selectedBranch?.id, shouldFilterBySalesman ? user?.id : null, globalStartDate, globalEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBranch?.id) params.append("branchId", selectedBranch.id.toString());
      if (shouldFilterBySalesman) params.append("salesmanId", user?.id.toString() || "");
      params.append("startDate", globalStartDate.toISOString());
      params.append("endDate", globalEndDate.toISOString());
      
      const url = `/api/stats/summary?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil summary");
      return res.json();
    }
  });

  const stats = useMemo(() => {
    return summaryData?.shipments || {
      total: 0,
      menunggu: 0,
      sedangPacking: 0,
      siapKirim: 0,
      prosesKirim: 0,
      terkirim: 0,
      fakturKembali: 0,
    };
  }, [summaryData]);

  const recentActivity = useMemo(() => {
    let activities = summaryData?.recentActivities || [];
    
    // Map string icon references back to Lucide components
    activities = activities.map(a => ({
      ...a,
      icon: a.iconType === 'history' ? History : (a.iconType === 'truck' ? Truck : ShoppingBag)
    }));

    switch (activeTab) {
      case 'admin':
        return activities.filter(a => a.type === 'admin').slice(0, 5);
      case 'sales':
        return activities.filter(a => a.type === 'sales').slice(0, 10);
      case 'gudang':
        return activities.filter(a => a.type === 'gudang').slice(0, 10);
      case 'home':
      default:
        return activities;
    }
  }, [summaryData, activeTab]);

  const filteredMenus = menus.filter(menu => {
    if (activeTab === 'home') return true;
    if (activeTab === 'sales' && menu.group === 'Sales & Data') return true;
    if (activeTab === 'gudang' && menu.group === 'Operasional') return true;
    if (activeTab === 'admin' && menu.group === 'Sistem') return true;
    return false;
  });

  // Group menus for display
  const groupedMenus = filteredMenus.reduce((acc, menu) => {
    if (!acc[menu.group]) acc[menu.group] = [];
    acc[menu.group].push(menu);
    return acc;
  }, {} as Record<string, typeof menus>);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] pb-12 overflow-x-hidden">
        {/* Dynamic Super App Header (Extended Behind Component) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[320px] md:h-[280px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 md:rounded-b-[4rem] rounded-b-[3rem] -z-10 shadow-2xl overflow-hidden">
           {/* Decorative circles */}
           <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[100%] bg-white/10 rounded-full blur-[80px]" />
           <div className="absolute top-[20%] right-[-10%] w-[60%] h-[80%] bg-blue-300/10 rounded-full blur-[60px]" />
        </div>

        <div className="pt-4 md:pt-10 px-3 sm:px-4 max-w-7xl mx-auto">
          {/* Greeting Section & Global Filter */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-white mb-6 px-1 md:px-6 gap-4">
            <div className="flex items-center gap-3 md:gap-4">
               <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 p-1 backdrop-blur-sm border border-white/30 shadow-xl overflow-hidden shadow-indigo-900/50">
                 <div className="w-full h-full bg-gradient-to-b from-indigo-100 to-white rounded-full flex items-center justify-center text-indigo-600 font-black text-lg md:text-2xl tracking-tighter shadow-inner">
                   {user?.displayName?.[0]?.toUpperCase() || 'U'}
                 </div>
               </div>
               <div>
                 <p className="text-white/80 text-[10px] md:text-sm font-bold uppercase tracking-widest mb-0.5">{t('dashboard_welcome', 'Hai, Selamat Datang')}</p>
                 <h1 className="text-lg md:text-3xl font-black tracking-tight leading-tight md:leading-none drop-shadow-md">
                   {user?.displayName}
                 </h1>
               </div>
            </div>
            
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
               <div className="flex items-center gap-2 w-full md:w-auto bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-lg justify-between md:justify-end">
                  <Select value={globalMonth.toString()} onValueChange={(v) => setGlobalMonth(parseInt(v))}>
                    <SelectTrigger className="w-full md:w-[130px] bg-transparent border-none text-white h-9 text-xs sm:text-sm font-bold focus:ring-0 focus:ring-offset-0">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                       {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <div className="w-px h-6 bg-white/20"></div>

                  <Select value={globalYear.toString()} onValueChange={(v) => setGlobalYear(parseInt(v))}>
                    <SelectTrigger className="w-full md:w-[100px] bg-transparent border-none text-white h-9 text-xs sm:text-sm font-bold focus:ring-0 focus:ring-offset-0">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                       {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               
               <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
                 <MapPin className="w-4 h-4 text-emerald-300" />
                 <span className="font-bold text-sm tracking-wide">{selectedBranch?.name || "-"}</span>
               </div>
            </div>
          </div>

          {/* Visual Banner */}
          <div className="px-1 md:px-6 mb-8">
            <div className={cn(
              "px-4 py-3 rounded-2xl border flex items-center justify-center text-xs sm:text-sm font-bold tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full transition-all duration-500",
              isCurrentMonth 
                ? "bg-emerald-500/20 text-emerald-50 border-emerald-400/30 backdrop-blur-xl" 
                : "bg-amber-500/80 text-white border-amber-400 backdrop-blur-xl animate-pulse ring-2 ring-amber-400/50"
            )}>
               <Calendar className={cn("w-4 h-4 mr-2", isCurrentMonth ? "text-emerald-300" : "text-white")} />
               {isCurrentMonth 
                 ? `Data Bulan Berjalan: ${months[globalMonth]} ${globalYear}` 
                 : `Anda sedang melihat data historis: ${months[globalMonth]} ${globalYear}`}
            </div>
          </div>

          {/* Floating Summary Cards (Wallet/Stats style) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 px-1 md:px-0">
             {/* Card 1: Total Penjualan (Sales) */}
             <div className="bg-white/95 backdrop-blur-2xl rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/60 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="flex justify-between items-start mb-2 md:mb-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-[0.75rem] md:rounded-[1rem] bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                     <Receipt className="w-4 h-4 md:w-5 md:h-5" />
                   </div>
                   <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-none font-bold text-[8px] md:text-xs uppercase tracking-wider px-1.5 md:px-2 shadow-sm rounded-lg opacity-80">Sales</Badge>
                </div>
                <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.05em] md:tracking-[0.1em] text-slate-400 mb-0.5">{t('dashboard_stats_revenue_label', 'Total Penjualan')}</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                   <h2 className="text-lg md:text-3xl font-black text-slate-800 tracking-tighter truncate">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(salesStats?.totalRevenueMonth || 0)}</h2>
                </div>
             </div>

             {/* Card 2: Order Pending */}
             <div className="bg-white/95 backdrop-blur-2xl rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/60 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="flex justify-between items-start mb-2 md:mb-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-[0.75rem] md:rounded-[1rem] bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                     <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
                   </div>
                   <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-none font-bold text-[8px] md:text-xs uppercase tracking-wider px-1.5 md:px-2 shadow-sm rounded-lg opacity-80">Orders</Badge>
                </div>
                <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.05em] md:tracking-[0.1em] text-slate-400 mb-0.5">{t('dashboard_stats_orders_label', 'Order Pending')}</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                   <h2 className="text-xl md:text-4xl font-black text-slate-800 tracking-tighter">{salesStats?.pendingOrdersCount || 0}</h2>
                </div>
             </div>

             {/* Card 3: Total Transaksi (Gudang) */}
             <div className="bg-white/95 backdrop-blur-2xl rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/60 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="flex justify-between items-start mb-2 md:mb-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-[0.75rem] md:rounded-[1rem] bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                     <Package className="w-4 h-4 md:w-5 md:h-5" />
                   </div>
                   <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-none font-bold text-[8px] md:text-xs uppercase tracking-wider px-1.5 md:px-2 shadow-sm rounded-lg opacity-80">Gudang</Badge>
                </div>
                <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.05em] md:tracking-[0.1em] text-slate-400 mb-0.5">{t('dashboard_stats_shipments_label', 'Total Transaksi')}</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                   <h2 className="text-xl md:text-4xl font-black text-slate-800 tracking-tighter">{stats.total}</h2>
                </div>
             </div>

             {/* Card 4: Sudah Terkirim */}
             <div className="bg-white/95 backdrop-blur-2xl rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/60 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="flex justify-between items-start mb-2 md:mb-4">
                   <div className="w-8 h-8 md:w-11 md:h-11 rounded-[0.75rem] md:rounded-[1rem] bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                     <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                   </div>
                   <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-none font-bold text-[8px] md:text-xs uppercase tracking-wider px-1.5 md:px-2 shadow-sm rounded-lg opacity-80">Kirim</Badge>
                </div>
                <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.05em] md:tracking-[0.1em] text-slate-400 mb-0.5">{t('dashboard_status_delivered', 'Sudah Terkirim')}</p>
                <div className="flex items-baseline gap-1 md:gap-2">
                   <h2 className="text-xl md:text-4xl font-black text-slate-800 tracking-tighter">{stats.terkirim}</h2>
                </div>
             </div>
          </div>

          <div className="mt-8 md:mt-12 space-y-8 md:space-y-12">
            
            {/* Super App Icon Grid (Quick Menus) */}
            <div className="space-y-8 px-1 md:px-0">
               {Object.entries(groupedMenus).map(([groupName, groupItems]) => (
                  <div key={groupName} className="space-y-3 md:space-y-4">
                     <div className="flex items-center gap-2">
                       <h3 className="text-[10px] md:text-[15px] font-black uppercase tracking-widest text-slate-400">{groupName}</h3>
                       <div className="flex-1 h-px bg-slate-200/60" />
                     </div>
                     <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-1.5 md:gap-x-6 gap-y-6 md:gap-6">
                        {groupItems.map((menu) => (
                           <Link key={menu.id} href={menu.path}>
                              <a className="flex flex-col items-center gap-1.5 md:gap-2 group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
                                 <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] bg-gradient-to-tr ${menu.color} flex items-center justify-center shadow-lg shadow-slate-200/40 group-hover:shadow-xl transition-shadow relative overflow-hidden`}>
                                   {/* Shine effect */}
                                   <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                   <menu.icon className="w-5 h-5 md:w-7 md:h-7 text-white stroke-[2.5px] drop-shadow-sm" />
                                 </div>
                                 <span className="text-[9px] md:text-[11px] font-black text-slate-600 text-center leading-[1.1] tracking-wide group-hover:text-primary transition-colors max-w-[65px] md:max-w-full">
                                    {menu.label}
                                 </span>
                              </a>
                           </Link>
                        ))}
                     </div>
                  </div>
               ))}
            </div>

            {/* Bottom Section: Activity Timeline & Horizontal Status Scroll */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-2 md:px-0 pt-4">
               {/* Left Column: Horizontal Scroll Cards + Banner */}
               <div className="lg:col-span-7 space-y-6">


                 {/* Promo/Ad Banner */}
                 <div className="w-full h-32 md:h-40 rounded-[2rem] bg-gradient-to-r from-violet-500 to-fuchsia-500 p-6 flex items-center justify-between shadow-lg shadow-violet-200 relative overflow-hidden group">
                    <div className="relative z-10 text-white space-y-1 max-w-[70%]">
                       <Badge variant="outline" className="border-white/30 text-white/90 font-bold uppercase tracking-widest text-[9px] mb-2 px-2 py-0.5 rounded-lg bg-white/10 backdrop-blur-md">{t('banner_info_label', 'Info Sistem')}</Badge>
                       
                       {activeTab === 'admin' || (activeTab === 'home' && isAdmin) ? (
                         <>
                           <h4 className="text-lg md:text-xl font-black leading-tight drop-shadow-sm">{t('banner_admin_title', 'Administrator Aktif')}</h4>
                           <p className="text-xs text-white/80 font-medium leading-relaxed hidden sm:block">{t('banner_admin_desc', 'Pantau seluruh pengguna, cabang, serta jejak audit sistem dalam satu pintu.')}</p>
                         </>
                       ) : activeTab === 'sales' || (activeTab === 'home' && isSalesman) ? (
                         <>
                           <h4 className="text-lg md:text-xl font-black leading-tight drop-shadow-sm">{t('banner_sales_title', 'Halo, Tim Sales!')}</h4>
                           <p className="text-xs text-white/80 font-medium leading-relaxed hidden sm:block">{t('banner_sales_desc', 'Fokus tingkatkan pesanan dan pantau cek stock. Semangat hari ini!')}</p>
                         </>
                       ) : activeTab === 'promo' || (activeTab === 'home' && isPromo) ? (
                         <>
                           <h4 className="text-lg md:text-xl font-black leading-tight drop-shadow-sm">{t('banner_promo_title', 'Halo, Tim Promo!')}</h4>
                           <p className="text-xs text-white/80 font-medium leading-relaxed hidden sm:block">{t('banner_promo_desc', 'Pelajari program-program promosi terintegrasi terbaru.')}</p>
                         </>
                       ) : (
                         <>
                           <h4 className="text-lg md:text-xl font-black leading-tight drop-shadow-sm">{t('banner_gudang_title', 'Halo, Tim Operasional Gudang!')}</h4>
                           <p className="text-xs text-white/80 font-medium leading-relaxed hidden sm:block">{t('banner_gudang_desc', `Terdapat ${stats.menunggu} antrean packing pengiriman. Selesaikan segera.`)}</p>
                         </>
                       )}
                    </div>
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform duration-500 shadow-xl relative z-10">
                       <LayoutGrid className="w-8 h-8 md:w-10 md:h-10 text-white stroke-2" />
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-[30px]" />
                 </div>
               </div>

               {/* Right Column: Activity Timeline */}
               <div className="lg:col-span-5 pb-8 md:pb-0">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm md:text-[15px] font-black uppercase tracking-widest text-slate-400">{t('dashboard_activity_title', 'Aktivitas Terbaru')}</h3>
                    <Button variant="ghost" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 rounded-xl">{t('button_view_all', 'Lihat Semua')}</Button>
                 </div>

                 <Card className="border-none shadow-[0_8px_40px_rgba(0,0,0,0.03)] bg-white rounded-[2rem] p-5">
                    <div className="space-y-6">
                       {summaryLoading ? (
                          [1,2,3].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />)
                       ) : recentActivity.length === 0 ? (
                          <div className="text-center py-8">
                             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                                <FileCheck className="w-6 h-6" />
                             </div>
                             <p className="text-xs font-bold text-slate-400">Belum ada aktivitas hari ini.</p>
                          </div>
                       ) : (
                          recentActivity.map((activity: any, index: number) => (
                             <div key={activity.id} className="relative flex gap-4 overflow-hidden group">
                                {/* Timeline Line */}
                                {index !== recentActivity.length - 1 && (
                                   <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-slate-100 group-hover:bg-indigo-100 transition-colors" />
                                )}
                                <div className="w-10 h-10 rounded-[1rem] bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm relative z-10">
                                   <activity.icon className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="space-y-1.5 pt-0.5 pb-2">
                                   <p className="text-sm font-black text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">
                                      {activity.title}
                                   </p>
                                   <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-[90%]">
                                      {activity.desc}
                                   </p>
                                   <div className="flex items-center gap-2 pt-1">
                                      <Clock className="w-3 h-3 text-slate-300" />
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {format(new Date(activity.time), "HH:mm, dd MMM")} {activity.user && `• ${activity.user}`}
                                      </span>
                                   </div>
                                </div>
                             </div>
                          ))
                       )}
                    </div>
                 </Card>
               </div>
            </div>

          </div>
          </div>
      </div>
  );
}
