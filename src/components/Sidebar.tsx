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
  Briefcase
} from 'lucide-react';
import { useAuth, Division } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const Sidebar: React.FC = () => {
  const { profile, signOut, division, setDivision } = useAuth();

  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/', 
      divisions: ['marketing', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting'] 
    },
    // Marketing Specific Menus
    { 
      name: 'Calon Konsumen', 
      icon: UserPlus, 
      path: '/leads', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Follow Up', 
      icon: MessageSquare, 
      path: '/follow-ups', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Titipan', 
      icon: Wallet, 
      path: '/deposits', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Penjualan', 
      icon: ShoppingCart, 
      path: '/sales', 
      divisions: ['marketing', 'audit'] 
    },
    { 
      name: 'Master Promo', 
      icon: Tag, 
      path: '/promos', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Price List', 
      icon: FileText, 
      path: '/price-list', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Siteplan', 
      icon: Map, 
      path: '/site-plan', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Denah', 
      icon: Layout, 
      path: '/floor-plan', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Jadwal Marketing', 
      icon: Calendar, 
      path: '/marketing-schedule', 
      divisions: ['marketing'] 
    },
    { 
      name: 'Master Marketing', 
      icon: UserCog, 
      path: '/marketing-master', 
      divisions: ['marketing'] 
    },

    // Teknik Specific Menus
    { 
      name: 'Proyek', 
      icon: Building2, 
      path: '/projects', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'Unit Properti', 
      icon: Home, 
      path: '/units', 
      divisions: ['marketing', 'teknik', 'audit'] 
    },
    { 
      name: 'RAB Proyek', 
      icon: Calculator, 
      path: '/rab', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'Progress Bangun', 
      icon: HardHat, 
      path: '/construction-progress', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'Stok Material', 
      icon: Package, 
      path: '/materials', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'Purchase Request', 
      icon: ClipboardList, 
      path: '/purchase-requests', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'SPK Kontraktor', 
      icon: FileText, 
      path: '/spk', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'Opname/Upah', 
      icon: ClipboardList, 
      path: '/opname', 
      divisions: ['teknik', 'audit'] 
    },
    { 
      name: 'Real Cost', 
      icon: BarChart3, 
      path: '/real-cost', 
      divisions: ['teknik', 'audit'] 
    },

    // Keuangan Specific Menus
    { 
      name: 'Pembayaran Konsumen', 
      icon: CreditCard, 
      path: '/payments', 
      divisions: ['marketing', 'keuangan', 'accounting', 'audit'] 
    },
    { 
      name: 'Pencairan KPR', 
      icon: Banknote, 
      path: '/kpr-disbursement', 
      divisions: ['keuangan', 'audit'] 
    },
    { 
      name: 'Pembayaran Supplier', 
      icon: Truck, 
      path: '/supplier-payments', 
      divisions: ['keuangan', 'audit'] 
    },
    { 
      name: 'Cash Flow', 
      icon: ArrowLeftRight, 
      path: '/cash-flow', 
      divisions: ['keuangan', 'accounting', 'audit'] 
    },
    { 
      name: 'Petty Cash', 
      icon: Wallet, 
      path: '/petty-cash', 
      divisions: ['keuangan', 'audit'] 
    },

    // Accounting Specific Menus
    { 
      name: 'Jurnal Umum', 
      icon: History, 
      path: '/general-journal', 
      divisions: ['accounting', 'audit'] 
    },
    { 
      name: 'Buku Besar', 
      icon: FileSpreadsheet, 
      path: '/ledger', 
      divisions: ['accounting', 'audit'] 
    },
    { 
      name: 'Laporan Keuangan', 
      icon: BarChart3, 
      path: '/financial-reports', 
      divisions: ['accounting', 'audit'] 
    },
    { 
      name: 'Perpajakan', 
      icon: Receipt, 
      path: '/taxation', 
      divisions: ['accounting', 'audit'] 
    },

    // HRD Specific Menus
    { 
      name: 'Data Karyawan', 
      icon: Users, 
      path: '/employees', 
      divisions: ['hrd', 'audit'] 
    },
    { 
      name: 'Absensi & Cuti', 
      icon: Clock, 
      path: '/attendance', 
      divisions: ['hrd', 'audit'] 
    },
    { 
      name: 'Payroll', 
      icon: Banknote, 
      path: '/payroll', 
      divisions: ['hrd', 'audit'] 
    },
    { 
      name: 'Rekrutmen', 
      icon: Briefcase, 
      path: '/recruitment', 
      divisions: ['hrd', 'audit'] 
    },

    // Audit Specific Menus
    { 
      name: 'Audit Transaksi', 
      icon: ShieldCheck, 
      path: '/audit-transactions', 
      divisions: ['audit'] 
    },
    { 
      name: 'Audit Stok', 
      icon: Package, 
      path: '/audit-stock', 
      divisions: ['audit'] 
    },
    { 
      name: 'Audit Biaya', 
      icon: Calculator, 
      path: '/audit-costs', 
      divisions: ['audit'] 
    },
  ];

  const filteredMenu = menuItems.filter(item => 
    division && item.divisions.includes(division)
  );

  return (
    <aside className="w-72 bg-slate-50 border-r border-slate-200/60 flex flex-col h-screen sticky top-0 z-40">
      <div className="p-8 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform hover:scale-110 duration-300">
          <Building2 className="text-white w-5 h-5" />
        </div>
        <div>
          <span className="text-xl font-black text-slate-900 tracking-tight block leading-none">PropDev</span>
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">ERP PRO 2026</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-8 overflow-y-auto scrollbar-hide">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Menu Utama</p>
        </div>
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden',
              isActive 
                ? 'bg-white text-primary shadow-xl shadow-indigo-100/50 after:absolute after:left-0 after:top-1/4 after:bottom-1/4 after:w-1 after:bg-primary after:rounded-r-full' 
                : 'text-slate-500 hover:bg-white/80 hover:text-slate-900'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isActive ? "text-primary" : "text-slate-400"
                )} />
                <span className="font-bold text-[13px] tracking-tight">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 m-4 mt-auto rounded-3xl bg-white border border-slate-100 shadow-premium">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary font-black text-lg shadow-sm">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-black text-slate-900 truncate leading-tight tracking-tight">{profile?.full_name}</p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1 opacity-70">{division}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-primary transition-all duration-200 group"
          >
            <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-bold text-xs">Ganti Divisi</span>
          </button>
          
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-danger transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-bold text-xs">Keluar Sistem</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
