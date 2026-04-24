import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Map, 
  Layout, 
  Tag, 
  Building2,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
}

const Dashboard: React.FC = () => {
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const navButtons = [
    { label: 'Price List', path: '/price-list', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
    { label: 'Siteplan', path: '/site-plan', icon: Map, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
    { label: 'Denah Unit', path: '/floor-plan', icon: Layout, color: 'text-amber-500', bg: 'bg-amber-50/50' },
    { label: 'Promo Unit', path: '/promos', icon: Tag, color: 'text-rose-500', bg: 'bg-rose-50/50' },
  ];

  const REQUIRED_FORMS = [
    { id: 'cash_bertahap', name: 'Perjanjian Cash Bertahap', type: 'docx' },
    { id: 'cash_keras', name: 'Perjanjian Cash Keras', type: 'docx' },
    { id: 'kpr', name: 'Perjanjian KPR', type: 'docx' },
    { id: 'lingkungan', name: 'Perjanjian Lingkungan', type: 'docx' },
    { id: 'denah', name: 'Pernyataan Denah', type: 'docx' },
    { id: 'rincian_harga', name: 'SURAT PERSETUJUAN RINCIAN HARGA JUAL', type: 'xlsx' },
  ];

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.get('document_templates', 'select=*');
      const mapping: Record<string, Template> = {};
      (data || []).forEach((t: Template) => { mapping[t.category] = t; });
      setTemplates(mapping);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, formId: string, formName: string, expectedType: string) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.name.endsWith('.' + expectedType)) { alert(`Mohon unggah file format .${expectedType}`); return; }

    try {
      setUploadingId(formId);
      const reader = new FileReader();
      const base64Content = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const existing = templates[formId];
      if (existing) {
        await api.update('document_templates', existing.id, { content: base64Content, name: formName });
      } else {
        await api.insert('document_templates', { name: formName, category: formId, content: base64Content });
      }
      fetchTemplates();
    } catch (error) { alert('Gagal mengunggah file.'); } finally { setUploadingId(null); }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* HEADER SECTION */}
      <div className="text-center space-y-4 pt-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 mb-6 transition-transform hover:rotate-6">
          <Building2 className="text-white w-10 h-10" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight">Pusat Dokumen Proyek</h1>
        <p className="text-slate-500 font-medium text-xl max-w-2xl mx-auto">Satu pintu untuk seluruh materi pemasaran dan administrasi standar perusahaan</p>
      </div>

      {/* NAVIGATION SECTION */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
        {navButtons.map((btn) => (
          <button 
            key={btn.label}
            onClick={() => window.location.href = btn.path}
            className="group p-8 flex flex-col items-center gap-4 rounded-[2.5rem] bg-white shadow-premium transition-all hover:shadow-2xl hover:-translate-y-2"
          >
            <div className={cn('p-5 rounded-[1.5rem] transition-transform group-hover:scale-110 shadow-sm', btn.bg)}>
              <btn.icon className={cn('w-8 h-8', btn.color)} />
            </div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* UPLOAD SLOTS SECTION */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
           <div className="h-px bg-slate-200 flex-1" />
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Manajemen Template Form Standar</h2>
           <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {REQUIRED_FORMS.map((form) => {
            const isUploaded = !!templates[form.id];
            const isUploading = uploadingId === form.id;

            return (
              <Card key={form.id} className={cn(
                "p-8 border-none shadow-premium rounded-[3rem] transition-all flex flex-col items-center text-center group",
                isUploaded ? "bg-white border border-slate-50" : "bg-slate-50/50 border-2 border-dashed border-slate-200"
              )}>
                <div className={cn(
                  "p-5 rounded-2xl mb-6 transition-all",
                  isUploaded ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-100 text-slate-300"
                )}>
                  {form.type === 'xlsx' ? <FileSpreadsheet className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                </div>
                
                <h3 className="font-black text-slate-900 mb-2 leading-tight min-h-[3rem] flex items-center justify-center px-4">{form.name}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-8">Format: .{form.type}</p>
                
                <div className="mt-auto w-full">
                  <input type="file" id={`dash-upload-${form.id}`} className="hidden" accept={`.${form.type}`} onChange={(e) => handleFileUpload(e, form.id, form.name, form.type)} />
                  <label htmlFor={`dash-upload-${form.id}`} className="block w-full">
                    <Button as="span" variant={isUploaded ? "outline" : "primary"} className="w-full rounded-2xl font-bold cursor-pointer h-14 shadow-sm" isLoading={isUploading}>
                      {isUploaded ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Ganti File</> : <><Upload className="w-4 h-4 mr-2" /> Unggah Sekarang</>}
                    </Button>
                  </label>
                </div>

                {isUploaded && (
                  <div className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" /> Dokumen Aktif
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-center pt-10">
        <div className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-4">
           PropDev Enterprise <span className="w-1 h-1 bg-slate-200 rounded-full" /> System v2.0
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
