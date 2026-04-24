import React from 'react';
import { 
  FileText, 
  Map, 
  Layout, 
  Tag, 
  Building2,
  Settings
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

const Dashboard: React.FC = () => {
  const documents = [
    { label: 'Price List', path: '/price-list', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
    { label: 'Siteplan', path: '/site-plan', icon: Map, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
    { label: 'Denah Unit', path: '/floor-plan', icon: Layout, color: 'text-amber-500', bg: 'bg-amber-50/50' },
    { label: 'Promo Unit', path: '/promos', icon: Tag, color: 'text-rose-500', bg: 'bg-rose-50/50' },
    { label: 'Template Dokumen', path: '/document-templates', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100/50' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10 py-10">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-200 mb-6">
          <Building2 className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Pusat Dokumen Proyek</h1>
        <p className="text-slate-500 font-medium text-lg">Akses cepat seluruh materi pemasaran dan administrasi</p>
      </div>

      <div className="w-full max-w-4xl">
        <Card className="p-10 border-none shadow-premium rounded-[3rem] bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {documents.map((btn) => (
              <button 
                key={btn.label}
                onClick={() => window.location.href = btn.path}
                className="group p-8 flex flex-col items-center gap-4 rounded-[2.5rem] bg-white border border-slate-50 transition-all hover:bg-slate-50 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2"
              >
                <div className={cn('p-5 rounded-[1.5rem] transition-transform group-hover:scale-110 shadow-sm', btn.bg)}>
                  <btn.icon className={cn('w-8 h-8', btn.color)} />
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">{btn.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        PropDev ERP • System v2.0
      </div>
    </div>
  );
};

export default Dashboard;
