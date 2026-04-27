import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
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
  Landmark
} from 'lucide-react';
import { useAuth, Division } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', divisions: ['marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'] },
  
  // HRD Priority (Requested Sequence)
  { name: 'Rekrutmen', icon: Briefcase, path: '/recruitment', divisions: ['hrd', 'audit'] },
  { name: 'Data Karyawan', icon: Users, path: '/employees', divisions: ['hrd', 'audit'] },
  { name: 'Absensi & Cuti', icon: Clock, path: '/attendance', divisions: ['hrd', 'audit'] },
  { name: 'Payroll', icon: Banknote, path: '/payroll', divisions: ['hrd', 'audit'] },

  // Finance/Accounting Shared Priority
  { name: 'Antrian Verifikasi', icon: UserCheck, path: '/verification-queue', divisions: ['keuangan', 'audit'] },
  { name: 'Cash Flow', icon: ArrowLeftRight, path: '/cash-flow', divisions: ['keuangan', 'accounting', 'audit'] },
  { name: 'Petty Cash', icon: Wallet, path: '/petty-cash', divisions: ['keuangan', 'audit'] },

  // Accounting Priority
  { name: 'Jurnal Umum', icon: History, path: '/general-journal', divisions: ['accounting', 'audit'] },
  { name: 'Buku Besar', icon: FileSpreadsheet, path: '/ledger', divisions: ['accounting', 'audit'] },
  { name: 'Perpajakan', icon: Receipt, path: '/taxation', divisions: ['accounting', 'audit'] },

  // Teknik Priority
  { name: 'Purchase Request', icon: ClipboardList, path: '/purchase-requests', divisions: ['teknik', 'audit'] },
  { name: 'Approval Manager', icon: ShieldCheck, path: '/approval-manager', divisions: ['teknik', 'audit'] },
  { name: 'Purchase Order', icon: ShoppingCart, path: '/purchase-orders', divisions: ['teknik', 'audit'] },
  { name: 'Penerimaan Barang', icon: Truck, path: '/goods-receipt', divisions: ['teknik', 'audit'] },
  { name: 'Pemakaian Material', icon: HardHat, path: '/material-usage', divisions: ['teknik', 'audit'] },
  { name: 'Stok Material', icon: Package, path: '/materials', divisions: ['teknik', 'audit'] },
  { name: 'Kartu Stok', icon: History, path: '/stock-card', divisions: ['teknik', 'audit'] },
  { name: 'RAB Proyek', icon: Calculator, path: '/rab', divisions: ['teknik', 'audit'] },
  { name: 'Opname/Upah', icon: ClipboardList, path: '/opname', divisions: ['teknik', 'audit'] },
  { name: 'SPK Kontraktor', icon: FileText, path: '/spk', divisions: ['teknik', 'audit'] },
  { name: 'Real Cost', icon: BarChart3, path: '/real-cost', divisions: ['teknik', 'audit'] },
  { name: 'Master Material', icon: Package, path: '/master-material', divisions: ['teknik', 'audit'] },
  { name: 'Master Supplier', icon: Users, path: '/material-suppliers', divisions: ['teknik', 'audit'] },

  // Marketing Priority
  { name: 'Calon Konsumen', icon: UserPlus, path: '/leads', divisions: ['marketing'] },
  { name: 'Follow Up', icon: MessageSquare, path: '/follow-ups', divisions: ['marketing'] },
  { name: 'Titipan', icon: Wallet, path: '/deposits', divisions: ['marketing'] },
  { name: 'Jadwal Konsultan', icon: Calendar, path: '/marketing-schedule', divisions: ['marketing'] },
  { name: 'Master Promo', icon: Tag, path: '/promos', divisions: ['marketing'] },
  { name: 'Price List', icon: FileText, path: '/price-list', divisions: ['marketing'] },
  { name: 'Siteplan', icon: Map, path: '/site-plan', divisions: ['marketing'] },
  { name: 'Denah', icon: Layout, path: '/floor-plan', divisions: ['marketing'] },
  
  // Shared Marketing/Teknik
  { name: 'Unit Properti', icon: Home, path: '/units', divisions: ['marketing', 'teknik', 'audit'] },
  { name: 'Progress Bangun', icon: HardHat, path: '/construction-progress', divisions: ['marketing', 'teknik', 'audit'] },
  
  // Marketing Mid-Late / Shared Accounting
  { name: 'Data Konsumen', icon: Users, path: '/customers', divisions: ['marketing', 'audit'] },
  { name: 'Penjualan', icon: ShoppingCart, path: '/sales', divisions: ['marketing', 'audit'] },
  { name: 'Laporan', icon: BarChart3, path: '/financial-reports', divisions: ['marketing', 'accounting', 'audit'] },
  { name: 'Pembayaran Konsumen', icon: CreditCard, path: '/payments', divisions: ['marketing', 'keuangan', 'accounting', 'audit'] },
  
  // Finance Priority Late
  { name: 'Pencairan KPR', icon: Banknote, path: '/kpr-disbursement', divisions: ['keuangan', 'audit'] },
  { name: 'Master Bank', icon: Landmark, path: '/bank-master', divisions: ['keuangan', 'audit'] },
  { name: 'Pembayaran Supplier', icon: Truck, path: '/supplier-payments', divisions: ['keuangan', 'audit'] },

  // Marketing Final
  { name: 'Template Dokumen', icon: FileText, path: '/document-templates', divisions: ['marketing', 'audit'] },
  { name: 'Proyek', icon: Building2, path: '/projects', divisions: ['marketing', 'teknik', 'audit'] },
  
  // System
  { name: 'User & Role', icon: ShieldCheck, path: '/user-management', divisions: ['marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'] },

  // Audit Specific Menus
  { name: 'Audit Transaksi', icon: ShieldCheck, path: '/audit-transactions', divisions: ['audit'] },
  { name: 'Audit Stok', icon: Package, path: '/audit-stock', divisions: ['audit'] },
  { name: 'Audit Biaya', icon: Calculator, path: '/audit-costs', divisions: ['audit'] },
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
    <aside className="w-72 bg-glass/40 backdrop-blur-glass border-r border-white/40 flex flex-col h-screen sticky top-0 z-40 print:hidden shadow-glass">
      <div className="px-6 pt-8 pb-4">
        <img 
          src="/logo-perusahaan.png" 
          alt="Company Logo" 
          className="w-[120%] -ml-4 h-32 object-contain object-left mix-blend-multiply scale-[1.3] origin-left transition-transform duration-300"
        />
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-8 overflow-y-auto scrollbar-hide">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">Menu Utama</p>
        </div>
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onClose?.()}
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-5 py-3 rounded-pill transition-all duration-300 group relative overflow-hidden',
              isActive 
                ? 'glass-convex text-text-primary after:absolute after:left-1 after:top-1/4 after:bottom-1/4 after:w-1 after:bg-accent-lavender after:rounded-full' 
                : 'text-text-secondary hover:bg-glass/50 hover:text-text-primary'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isActive ? "text-accent-dark" : "text-text-muted group-hover:text-text-primary"
                )} />
                <span className="font-bold text-[13px] tracking-tight">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-5 m-4 mt-auto rounded-xl bg-glass-deep/50 border border-white/40 shadow-inset">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 rounded-full bg-white border border-white/60 flex items-center justify-center text-accent-dark font-black text-lg shadow-glass">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-black text-text-primary truncate leading-tight tracking-tight">{profile?.full_name}</p>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1 opacity-70">{division}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          {((profile?.role_data?.authorized_divisions?.length || 0) > 1 || profile?.role === 'admin') && (
            <button
              onClick={() => {
                localStorage.removeItem('propdev_division');
                setDivision(null);
                onClose?.();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-pill hover:bg-white/40 text-text-secondary hover:text-text-primary transition-all duration-200 group"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="font-bold text-[11px] uppercase tracking-wider">Ganti Divisi</span>
            </button>
          )}
          
          <button
            onClick={() => {
              signOut();
              onClose?.();
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-pill hover:bg-red-400/20 text-text-secondary hover:text-red-500 transition-all duration-200 group"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-bold text-[11px] uppercase tracking-wider">Keluar</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
