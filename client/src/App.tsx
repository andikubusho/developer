import React from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { useAuth } from "@/hooks/use-auth";

// Page Imports
import { usePermissions } from "@/hooks/use-permissions";
import { BranchProvider } from "@/hooks/use-branch";
import { GlobalPeriodProvider } from "@/hooks/use-global-period";
import { SocketProvider } from "@/providers/socket-provider";
import { NotificationManager } from "@/components/NotificationManager";
import PageLoader from "./components/PageLoader";

// Lazy Page Imports
const Dashboard = React.lazy(() => import("./pages/dashboard"));
const Expeditions = React.lazy(() => import("./pages/master/expeditions"));
const Customers = React.lazy(() => import("./pages/master/customers"));
const UsersPage = React.lazy(() => import("./pages/master/users"));
const BranchesPage = React.lazy(() => import("./pages/master/branches"));
const InputPengiriman = React.lazy(() => import("./pages/pengiriman/input"));
const VerifikasiGudang = React.lazy(() => import("./pages/pengiriman/verifikasi"));
const SiapKirim = React.lazy(() => import("./pages/pengiriman/siap-kirim"));
const Terkirim = React.lazy(() => import("./pages/pengiriman/terkirim"));
const KirimanSelesai = React.lazy(() => import("./pages/pengiriman/kiriman-selesai"));
const PengembalianFaktur = React.lazy(() => import("./pages/pengembalian/faktur"));
const RoleSelection = React.lazy(() => import("./pages/role-selection"));
const AuditLogsPage = React.lazy(() => import("./pages/admin/audit-logs"));
const ItemsPage = React.lazy(() => import("./pages/master/items"));
const OrdersPage = React.lazy(() => import("./pages/salesman/orders"));
const TaxesPage = React.lazy(() => import("./pages/master/taxes"));
const StockPage = React.lazy(() => import("./pages/salesman/stock"));
const RolesPage = React.lazy(() => import("./pages/master/roles"));
const SettingsTextPage = React.lazy(() => import("./pages/admin/settings-text"));
const ShipmentReport = React.lazy(() => import("./pages/reports/shipment-report"));
const OrderReport = React.lazy(() => import("./pages/reports/order-report"));

// Integrated Promo System (New)
const TransaksiIntegrated = React.lazy(() => import("./pages/promo/TransaksiIntegrated"));
const MonitoringIntegrated = React.lazy(() => import("./pages/promo/MonitoringIntegrated"));
const PencairanIntegrated = React.lazy(() => import("./pages/promo/PencairanIntegrated"));
const PrincipalClaims = React.lazy(() => import("./pages/promo/PrincipalClaims"));
const MasterPromoIntegrated = React.lazy(() => import("./pages/promo/MasterPromoIntegrated"));
const ProgramPelanggan = React.lazy(() => import("./pages/promo/ProgramPelanggan"));
const PrincipalMaster = React.lazy(() => import("./pages/master/PrincipalMaster"));

// Keep temporarily as requested (Shared by new system)
const PromoBrands = React.lazy(() => import("./pages/promo/brands"));

import { Button } from "@/components/ui/button";

function ProtectedRoute({ component: Component, menuKey }: { component: React.ComponentType, menuKey?: string }) {
  const { user, isLoading } = useAuth();
  const { can, isLoading: isPermsLoading, error: permsError } = usePermissions();

  if (isLoading || (isPermsLoading && !permsError)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-tight">
          {isLoading ? "Memuat Sesi (Auth)..." : "Memuat Hak Akses (Permissions)..."}
        </span>
      </div>
    );
  }

  // If there's a permissions error but we have a user (especially admin), we might want to proceed or show a specific error
  if (!user) return <Redirect to="/login" />;

  if (menuKey && !can(menuKey, "view")) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h2>
            <p className="text-slate-600 mb-8">Aplikasi mengalami kendala saat memuat halaman. Silakan muat ulang halaman atau hubungi administrator.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Layout } from "./components/layout";

function Router() {
  const [location] = useLocation();
  const noLayoutPaths = ["/login", "/role-selection"];
  const needsLayout = !noLayoutPaths.includes(location);

  const content = (
    <ErrorBoundary>
      <React.Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/login" component={Login} />
          
          {/* Integrated Promo New System Routes (Moved to top to prevent redirect hijacking) */}
          <Route path="/promo/integrated/transaksi" component={() => <ProtectedRoute component={TransaksiIntegrated} menuKey="transaksi_promo" />} />
          <Route path="/promo/integrated/monitoring" component={() => <ProtectedRoute component={MonitoringIntegrated} menuKey="monitoring_promo" />} />
          <Route path="/promo/integrated/pencairan" component={() => <ProtectedRoute component={PencairanIntegrated} menuKey="pencairan_promo" />} />
          <Route path="/promo/principal-claim" component={() => <ProtectedRoute component={PrincipalClaims} menuKey="klaim_principal" />} />
          <Route path="/promo/integrated/master" component={() => <ProtectedRoute component={MasterPromoIntegrated} menuKey="master_promo_integrated" />} />
          <Route path="/promo/integrated/pelanggan" component={() => <ProtectedRoute component={ProgramPelanggan} menuKey="program_pelanggan" />} />

          <Route path="/role-selection" component={() => <ProtectedRoute component={RoleSelection} />} />
          
          {/* Legacy Routing Aliases -> Super App Home */}
          <Route path="/salesman" component={() => <Redirect to="/" />} />
          <Route path="/admin" component={() => <Redirect to="/" />} />
          <Route path="/promo" component={() => <Redirect to="/" />} />
          <Route path="/gudang" component={() => <Redirect to="/" />} />
          
          {/* Main Super App Dashboard / Home */}
          <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />

          {/* Salesman Pages */}
          <Route path="/salesman/users" component={() => <ProtectedRoute component={UsersPage} menuKey="master_user" />} />
          <Route path="/salesman/customers" component={() => <ProtectedRoute component={Customers} />} />
          
          {/* Admin Pages */}
          <Route path="/admin/taxes" component={() => <ProtectedRoute component={TaxesPage} menuKey="master_ppn" />} />
          <Route path="/admin/users" component={() => <ProtectedRoute component={UsersPage} menuKey="master_user" />} />
          <Route path="/admin/audit-logs" component={() => <ProtectedRoute component={AuditLogsPage} menuKey="master_user" />} />
          <Route path="/admin/branches" component={() => <ProtectedRoute component={BranchesPage} menuKey="master_cabang" />} />
          <Route path="/admin/roles" component={() => <ProtectedRoute component={RolesPage} menuKey="master_role" />} />
          <Route path="/admin/settings-text" component={() => <ProtectedRoute component={SettingsTextPage} menuKey="pengaturan_teks" />} />

          <Route path="/reports/shipments" component={() => <ProtectedRoute component={ShipmentReport} menuKey="laporan_pengiriman" />} />
          <Route path="/reports/orders" component={() => <ProtectedRoute component={OrderReport} menuKey="laporan_surat_order" />} />
          
          <Route path="/master/expeditions" component={() => <ProtectedRoute component={Expeditions} menuKey="master_ekspedisi" />} />
          <Route path="/master/customers" component={() => <ProtectedRoute component={Customers} menuKey="master_pelanggan" />} />
          <Route path="/master/branches" component={() => <ProtectedRoute component={BranchesPage} menuKey="master_cabang" />} />
          <Route path="/master/users" component={() => <ProtectedRoute component={UsersPage} menuKey="master_user" />} />
          <Route path="/master/principals" component={() => <ProtectedRoute component={PrincipalMaster} menuKey="master_principal" />} />
          <Route path="/pengiriman/input" component={() => <ProtectedRoute component={InputPengiriman} menuKey="input_pengiriman" />} />
          <Route path="/pengiriman/verifikasi" component={() => <ProtectedRoute component={VerifikasiGudang} menuKey="packing" />} />
          <Route path="/pengiriman/siap-kirim" component={() => <ProtectedRoute component={SiapKirim} menuKey="siap_kirim" />} />
          <Route path="/pengiriman/terkirim" component={() => <ProtectedRoute component={Terkirim} menuKey="terkirim" />} />
          <Route path="/kiriman-selesai" component={() => <ProtectedRoute component={KirimanSelesai} menuKey="terkirim" />} />
          <Route path="/pengembalian/faktur" component={() => <ProtectedRoute component={PengembalianFaktur} menuKey="pengembalian" />} />
          <Route path="/master/items" component={() => <ProtectedRoute component={ItemsPage} menuKey="master_barang" />} />
          <Route path="/salesman/items" component={() => <ProtectedRoute component={ItemsPage} menuKey="master_barang" />} />
          <Route path="/salesman/orders" component={() => <ProtectedRoute component={OrdersPage} menuKey="surat_order" />} />
          <Route path="/salesman/stock" component={() => <ProtectedRoute component={StockPage} menuKey="cek_stock" />} />
          
          {/* Keep for now as shared dependency */}
          <Route path="/promo/brands" component={() => <ProtectedRoute component={PromoBrands} menuKey="master_merek_promo" />} />

          <Route component={NotFound} />
        </Switch>
      </React.Suspense>
    </ErrorBoundary>
  );

  return needsLayout ? <Layout>{content}</Layout> : content;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BranchProvider>
          <GlobalPeriodProvider>
            <TooltipProvider>
              <Toaster />
              <NotificationManager />
              <Router />
            </TooltipProvider>
          </GlobalPeriodProvider>
        </BranchProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
