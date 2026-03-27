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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Building2 className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">PropDev ERP</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto scrollbar-hide">
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
              isActive 
                ? 'bg-indigo-600 text-white' 
                : 'hover:bg-slate-800 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{division}</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('user_division');
            setDivision(null);
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400 mb-1"
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span className="font-medium">Ganti Divisi</span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-900/20 hover:text-red-400 transition-colors text-slate-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
