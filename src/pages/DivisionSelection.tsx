import React from 'react';
import { useAuth, Division } from '../contexts/AuthContext';
import { ShoppingCart, HardHat, Landmark, Building2, ShieldCheck, UserCheck, Calculator, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { ALL_DIVISIONS } from '../types';

import { useEffect } from 'react';

const DivisionSelection: React.FC = () => {
  const { setDivision, profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'admin') return;
    
    const allowed = profile?.role_data?.authorized_divisions || [];
    if (allowed.length === 1) {
      setDivision(allowed[0] as Division);
    }
  }, [profile, setDivision]);

  const divisions: { id: Division; name: string; icon: any; description: string; color: string }[] = [
    {
      id: 'marketing',
      name: 'Marketing',
      icon: ShoppingCart,
      description: 'Manajemen unit, pelanggan, penjualan, dan pembayaran.',
      color: 'bg-blue-500',
    },
    {
      id: 'teknik',
      name: 'Teknik',
      icon: HardHat,
      description: 'Manajemen proyek, progres pembangunan, dan material.',
      color: 'bg-emerald-500',
    },
    {
      id: 'keuangan',
      name: 'Keuangan',
      icon: Landmark,
      description: 'Laporan keuangan, pembayaran, dan purchase orders.',
      color: 'bg-amber-500',
    },
    {
      id: 'audit',
      name: 'Audit',
      icon: ShieldCheck,
      description: 'Pemeriksaan kepatuhan, verifikasi data, dan kontrol internal.',
      color: 'bg-rose-500',
    },
    {
      id: 'hrd',
      name: 'HRD',
      icon: UserCheck,
      description: 'Manajemen karyawan, absensi, dan administrasi SDM.',
      color: 'bg-purple-500',
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: Calculator,
      description: 'Pembukuan, perpajakan, dan rekonsiliasi keuangan.',
      color: 'bg-cyan-500',
    },
  ];

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6 selection:bg-accent-lavender/30 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-mint/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-lavender/20 blur-[120px] rounded-full animate-pulse" />

      <div className="max-w-5xl w-full relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center justify-center w-auto h-32 mb-10 animate-bounce-subtle">
            <img 
              src="/logo-perusahaan.png" 
              alt="Company Logo" 
              className="h-full w-auto object-contain mix-blend-multiply scale-[1.3]"
            />
          </div>
          <h1 className="text-4xl font-black text-accent-dark tracking-tight">Selamat Datang, {profile?.full_name}</h1>
          <p className="text-text-secondary text-lg font-bold uppercase tracking-[0.3em] opacity-70">Silakan pilih divisi Anda untuk melanjutkan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {divisions
            .filter(div => {
              if (profile?.role === 'admin') return true;
              const allowed = profile?.role_data?.authorized_divisions || [];
              return allowed.includes(div.id);
            })
            .map((div) => (
            <button
              key={div.id}
              onClick={() => setDivision(div.id)}
              className="group text-left focus:outline-none transition-all duration-500 hover:-translate-y-2"
            >
              <Card className="h-full p-8 bg-white/40 border-white/70 shadow-glass group-hover:bg-white/60 group-hover:shadow-glass-2 transition-all">
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center mb-8 text-accent-dark shadow-glass transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                  div.id === 'marketing' ? 'bg-accent-mint/50' :
                  div.id === 'teknik' ? 'bg-accent-lavender/50' :
                  'bg-accent-peach/50'
                )}>
                  <div.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-accent-dark mb-3 tracking-tight">{div.name}</h3>
                <p className="text-text-secondary text-sm font-medium leading-relaxed mb-8">{div.description}</p>
                
                <div className="mt-auto flex items-center text-accent-dark text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0">
                  Pilih Divisi
                  <ChevronRight className="w-4 h-4 ml-2" />
                </div>
              </Card>
            </button>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em]">PropDev ERP Pro v2.6.0 &bull; Precision Access</p>
        </div>
      </div>
    </div>
  );
};

export default DivisionSelection;

