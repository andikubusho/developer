import React from 'react';
import { useAuth, Division } from '../contexts/AuthContext';
import { ShoppingCart, HardHat, Landmark, Building2, ShieldCheck, UserCheck, Calculator } from 'lucide-react';
import { Card } from '../components/ui/Card';

const DivisionSelection: React.FC = () => {
  const { setDivision, profile } = useAuth();

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-6 shadow-lg shadow-indigo-200">
            <Building2 className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Selamat Datang, {profile?.full_name}</h1>
          <p className="text-slate-500 text-lg">Silakan pilih divisi Anda untuk melanjutkan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {divisions.map((div) => (
            <button
              key={div.id}
              onClick={() => setDivision(div.id)}
              className="group text-left transition-transform hover:-translate-y-1 focus:outline-none"
            >
              <Card className="h-full p-8 border-2 border-transparent group-hover:border-indigo-500 transition-all">
                <div className={`w-14 h-14 ${div.color} rounded-xl flex items-center justify-center mb-6 text-white shadow-lg`}>
                  <div.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{div.name}</h3>
                <p className="text-slate-500 leading-relaxed">{div.description}</p>
                <div className="mt-6 flex items-center text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Pilih Divisi
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DivisionSelection;

