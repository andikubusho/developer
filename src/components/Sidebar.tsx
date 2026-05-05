import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Plus,
  Building2, 
  Users, 
  Home, 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  Package, 
  Settings,
  LogOut,
  ArrowLeftRight,
  UserPlus,
  MessageSquare,
  Wallet,
  Tag,
  FileText,
  Map,
  Layout,
  Calendar,
  UserCog,
  Calculator,
  FileSpreadsheet,
  HardHat,
  ClipboardList,
  Truck,
  Receipt,
  Banknote,
  History,
  ShieldCheck,
  UserCheck,
  Clock,
  Briefcase,
  Landmark,
  PenTool,
  Store,
  BookOpen
} from 'lucide-react';
import { useAuth, Division } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', divisions: ['marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'] },
  
  // Finance Section
  { name: 'Petty Cash', icon: Wallet, path: '/petty-cash', divisions: ['keuangan', 'audit'], category: 'MANAJEMEN KAS' },
  { name: 'Cash Flow', icon: ArrowLeftRight, path: '/cash-flow', divisions: ['keuangan', 'accounting', 'audit'], category: 'MANAJEMEN KAS' },
  { name: 'Master Bank', icon: Landmark, path: '/bank-master', divisions: ['keuangan', 'audit'], category: 'MANAJEMEN KAS' },

  { name: 'Master Supplier', icon: Store, path: '/material-suppliers', divisions: ['keuangan', 'audit'], category: 'HUTANG PIUTANG' },
  { name: 'Hutang Supplier', icon: Truck, path: '/supplier-payables', divisions: ['keuangan', 'audit'], category: 'HUTANG PIUTANG' },
  { name: 'Piutang Konsumen', icon: FileText, path: '/customer-receivables', divisions: ['keuangan', 'audit'], category: 'HUTANG PIUTANG' },
  { name: 'Pencairan KPR', icon: Banknote, path: '/kpr-disbursement', divisions: ['keuangan', 'audit'], category: 'HUTANG PIUTANG' },

  { name: 'Pembayaran Supplier', icon: Truck, path: '/supplier-payments', divisions: ['keuangan', 'audit'], category: 'VERIFIKASI & BAYAR' },
  { name: 'Pembayaran Opname/Upah', icon: Banknote, path: '/opname-payment', divisions: ['keuangan', 'audit'], category: 'VERIFIKASI & BAYAR' },
  { name: 'Antrian Verifikasi', icon: UserCheck, path: '/verification-queue', divisions: ['keuangan', 'audit'], category: 'VERIFIKASI & BAYAR' },

  // HRD & Payroll
  { name: 'Rekrutmen', icon: Briefcase, path: '/recruitment', divisions: ['hrd', 'audit'], category: 'HRD & PAYROLL' },
  { name: 'Data Karyawan', icon: Users, path: '/employees', divisions: ['hrd', 'audit'], category: 'HRD & PAYROLL' },
  { name: 'Absensi & Cuti', icon: Clock, path: '/attendance', divisions: ['hrd', 'audit'], category: 'HRD & PAYROLL' },
  { name: 'Payroll', icon: Banknote, path: '/payroll', divisions: ['hrd', 'audit'], category: 'HRD & PAYROLL' },

  // Accounting
  { name: 'Master Akun', icon: BookOpen, path: '/master-account', divisions: ['accounting', 'audit'], category: 'ACCOUNTING' },
  { name: 'Jurnal Umum', icon: History, path: '/general-journal', divisions: ['accounting', 'audit'], category: 'ACCOUNTING' },
  { name: 'Buku Besar', icon: FileSpreadsheet, path: '/ledger', divisions: ['accounting', 'audit'], category: 'ACCOUNTING' },
  { name: 'Perpajakan', icon: Receipt, path: '/taxation', divisions: ['accounting', 'audit'], category: 'ACCOUNTING' },

  // Marketing - PROSPEK & PENJUALAN
  { name: 'Calon Konsumen', icon: UserPlus, path: '/leads', divisions: ['marketing'], category: 'MKT: PROSPEK & SALES' },
  { name: 'Follow Up', icon: MessageSquare, path: '/follow-ups', divisions: ['marketing'], category: 'MKT: PROSPEK & SALES' },
  { name: 'Titipan', icon: Wallet, path: '/deposits', divisions: ['marketing'], category: 'MKT: PROSPEK & SALES' },
  { name: 'Penjualan', icon: ShoppingCart, path: '/sales', divisions: ['marketing', 'audit'], category: 'MKT: PROSPEK & SALES' },
  { name: 'Pembayaran Konsumen', icon: Plus, path: '/consumer-payments', divisions: ['marketing', 'keuangan', 'accounting', 'audit'], category: 'MKT: PROSPEK & SALES' },
  { name: 'Schedule Pembayaran', icon: History, path: '/payments', divisions: ['marketing', 'keuangan', 'accounting', 'audit'], category: 'MKT: PROSPEK & SALES' },
  { name: 'Pekerjaan Tambahan', icon: PenTool, path: '/sale-addons', divisions: ['marketing', 'audit'], category: 'MKT: PROSPEK & SALES' },

  // Marketing - MANAJEMEN KONSUMEN
  { name: 'Data Konsumen', icon: Users, path: '/customers', divisions: ['marketing', 'audit'], category: 'MKT: KONSUMEN' },
  { name: 'Template Dokumen', icon: FileText, path: '/document-templates', divisions: ['marketing', 'audit'], category: 'MKT: KONSUMEN' },

  // Marketing - INVENTORI & VISUAL
  { name: 'Siteplan', icon: Map, path: '/site-plan', divisions: ['marketing'], category: 'MKT: PRODUK & VISUAL' },
  { name: 'Denah', icon: Layout, path: '/floor-plan', divisions: ['marketing'], category: 'MKT: PRODUK & VISUAL' },

  // Marketing - TOOLS
  { name: 'Price List', icon: FileText, path: '/price-list', divisions: ['marketing'], category: 'MKT: TOOLS & LAPORAN' },
  { name: 'Master Promo', icon: Tag, path: '/promos', divisions: ['marketing'], category: 'MKT: TOOLS & LAPORAN' },
  { name: 'Master Konsultan', icon: Users, path: '/marketing-master', divisions: ['marketing'], category: 'MKT: TOOLS & LAPORAN' },
  { name: 'Jadwal Konsultan', icon: Calendar, path: '/marketing-schedule', divisions: ['marketing'], category: 'MKT: TOOLS & LAPORAN' },
  { name: 'Laporan', icon: BarChart3, path: '/reports', divisions: ['marketing'], category: 'MKT: TOOLS & LAPORAN' },
  { name: 'Laporan', icon: BarChart3, path: '/financial-reports', divisions: ['accounting', 'audit'], category: 'MKT: TOOLS & LAPORAN' },
  
  // Teknik - PERENCANAAN
  { name: 'RAB Proyek', icon: Calculator, path: '/rab', divisions: ['teknik', 'audit'], category: 'TEKNIK: PERENCANAAN' },
  { name: 'Proyek', icon: Building2, path: '/projects', divisions: ['marketing', 'teknik', 'audit'], category: 'TEKNIK: PERENCANAAN' },
  { name: 'Unit Properti', icon: Home, path: '/units', divisions: ['marketing', 'teknik', 'audit'], category: 'TEKNIK: PERENCANAAN' },
  
  // Teknik - LOGISTIK & STOK
  { name: 'Purchase Request', icon: ClipboardList, path: '/purchase-requests', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  { name: 'Approval Manager', icon: ShieldCheck, path: '/approval-manager', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  { name: 'Purchase Order', icon: ShoppingCart, path: '/purchase-orders', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  { name: 'Penerimaan Barang', icon: Truck, path: '/goods-receipt', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  { name: 'Pemakaian Material', icon: HardHat, path: '/material-usage', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  { name: 'Stok Material', icon: Package, path: '/materials', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  { name: 'Kartu Stok', icon: History, path: '/stock-card', divisions: ['teknik', 'audit'], category: 'TEKNIK: LOGISTIK' },
  
  // Teknik - PELAKSANAAN & BIAYA
  { name: 'SPK Kontraktor', icon: FileText, path: '/spk', divisions: ['teknik', 'audit'], category: 'TEKNIK: PELAKSANAAN' },
  { name: 'Input Opname Baru', icon: Plus, path: '/opname/new', divisions: ['teknik', 'audit'], category: 'TEKNIK: PELAKSANAAN' },
  { name: 'Histori Opname', icon: History, path: '/opname', divisions: ['teknik', 'audit'], category: 'TEKNIK: PELAKSANAAN' },
  { name: 'Progress Bangun', icon: HardHat, path: '/construction-progress', divisions: ['marketing', 'teknik', 'audit'], category: 'TEKNIK: PELAKSANAAN' },
  { name: 'Penugasan Mandor', icon: UserCheck, path: '/worker-assignment', divisions: ['teknik', 'audit'], category: 'TEKNIK: PELAKSANAAN' },
  { name: 'Real Cost', icon: BarChart3, path: '/real-cost', divisions: ['teknik', 'audit'], category: 'TEKNIK: PELAKSANAAN' },

  // Teknik - KAS PROYEK
  { name: 'Petty Cash Teknik', icon: Wallet, path: '/petty-cash-teknik', divisions: ['teknik', 'audit'], category: 'TEKNIK: KAS' },

  // Teknik - DATA MASTER
  { name: 'Master Material', icon: Package, path: '/master-material', divisions: ['teknik', 'audit'], category: 'TEKNIK: MASTER' },
  { name: 'Master Supplier', icon: Users, path: '/material-suppliers', divisions: ['teknik', 'audit'], category: 'TEKNIK: MASTER' },
  { name: 'Master Penerima Upah', icon: UserCheck, path: '/worker-master', divisions: ['teknik', 'audit'], category: 'TEKNIK: MASTER' },
  
  // System
  { name: 'User & Role', icon: ShieldCheck, path: '/user-management', divisions: ['marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'], category: 'SISTEM' },

  // Audit Specific
  { name: 'Audit Transaksi', icon: ShieldCheck, path: '/audit-transactions', divisions: ['audit'], category: 'AUDIT' },
  { name: 'Audit Stok', icon: Package, path: '/audit-stock', divisions: ['audit'], category: 'AUDIT' },
  { name: 'Audit Biaya', icon: Calculator, path: '/audit-costs', divisions: ['audit'], category: 'AUDIT' },
];

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { profile, signOut, division, setDivision } = useAuth();

  const filteredMenu = menuItems.filter(item => {
    const hasDivision = division && item.divisions.includes(division);
    if (item.path === '/user-management') {
      return hasDivision && profile?.role === 'admin';
    }
    return hasDivision;
  });

  return (
    <aside id="sidebar-nav" className="w-72 glass-card m-4 mr-0 flex flex-col h-[calc(100vh-2rem)] sticky top-4 z-40 print:hidden">
      <div className="px-8 pt-10 pb-4">
        <img 
          src="/logo-perusahaan.png" 
          alt="Company Logo" 
          className="w-full h-auto object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105"
        />
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 px-4 space-y-1 mt-8 overflow-y-auto scrollbar-hide">
        <div className="px-6 mb-4">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-2 opacity-50">Menu Utama</p>
        </div>
        {filteredMenu.map((item, index) => {
          const prevItem = index > 0 ? filteredMenu[index - 1] : null;
          const showCategory = item.category && item.category !== prevItem?.category;

          return (
            <React.Fragment key={item.path}>
              {showCategory && (
                <div className="px-6 pt-8 pb-3 animate-in fade-in slide-in-from-left-4 duration-500">
                  <p className="text-[9px] font-black text-accent-lavender uppercase tracking-[0.25em]">{item.category}</p>
                </div>
              )}
              <NavLink
                to={item.path}
                onClick={() => onClose?.()}
                className={({ isActive }) => cn(
                  'flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden',
                  isActive 
                    ? 'bg-accent-lavender text-text-primary shadow-[0_10px_20px_-5px_rgba(139,119,255,0.5),inset_0_4px_6px_rgba(255,255,255,0.3)] border border-white/30' 
                    : 'text-text-secondary hover:bg-white/40 hover:text-text-primary'
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform group-hover:scale-110",
                      isActive ? "text-text-primary" : "text-text-muted group-hover:text-text-primary"
                    )} />
                    <span className="font-bold text-[13px] tracking-tight">{item.name}</span>
                  </>
                )}
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-6 m-4 mt-auto rounded-3xl shadow-3d-inset bg-white/30 backdrop-blur-sm border border-white/40">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-white/60 flex items-center justify-center text-accent-lavender font-black text-xl shadow-3d">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[14px] font-black text-text-primary truncate leading-tight tracking-tight italic uppercase">{profile?.full_name}</p>
            <p className="text-[9px] font-black text-accent-lavender uppercase tracking-[0.2em] mt-1 opacity-80">{division}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          {((profile?.role_data?.authorized_divisions?.length || 0) > 1 || profile?.role === 'admin') && (
            <button
              onClick={() => {
                localStorage.removeItem('propdev_division');
                setDivision(null);
                onClose?.();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/60 text-text-secondary hover:text-text-primary transition-all duration-300 group shadow-sm hover:shadow-3d"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="font-bold text-[11px] uppercase tracking-widest">Ganti Divisi</span>
            </button>
          )}
          
          <button
            onClick={() => {
              signOut();
              onClose?.();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-rose-500/20 text-text-secondary hover:text-rose-600 transition-all duration-300 group shadow-sm hover:shadow-3d"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-bold text-[11px] uppercase tracking-widest">Keluar</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
