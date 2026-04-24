import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Upload, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
}

const DocumentTemplates: React.FC = () => {
  const { setDivision } = useAuth();
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
      (data || []).forEach((t: Template) => {
        mapping[t.category] = t;
      });
      setTemplates(mapping);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, formId: string, formName: string, expectedType: string) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    if (!file.name.endsWith('.' + expectedType)) {
      alert(`Mohon unggah file format .${expectedType}`);
      return;
    }

    try {
      setUploadingId(formId);
      const reader = new FileReader();
      const base64Content = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const existing = templates[formId];
      if (existing) {
        await api.update('document_templates', existing.id, {
          content: base64Content,
          name: formName
        });
      } else {
        await api.insert('document_templates', {
          name: formName,
          category: formId,
          content: base64Content
        });
      }

      fetchTemplates();
    } catch (error) {
      console.error(error);
      alert('Gagal mengunggah file.');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto rounded-xl">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Template Form</h1>
          <p className="text-slate-500 font-medium text-sm">Unggah 6 dokumen standar perusahaan untuk otomatisasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REQUIRED_FORMS.map((form) => {
          const isUploaded = !!templates[form.id];
          const isUploading = uploadingId === form.id;

          return (
            <Card key={form.id} className={cn(
              "p-8 border-none shadow-premium rounded-[2.5rem] transition-all flex flex-col items-center text-center group",
              isUploaded ? "bg-white" : "bg-slate-50/50 border-2 border-dashed border-slate-200"
            )}>
              <div className={cn(
                "p-5 rounded-2xl mb-6 transition-all",
                isUploaded ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" : "bg-slate-100 text-slate-400"
              )}>
                {form.type === 'xlsx' ? <FileSpreadsheet className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
              </div>
              
              <h3 className="font-black text-slate-900 mb-2 leading-tight px-4">{form.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Format: .{form.type}</p>
              
              <div className="mt-auto w-full">
                <input 
                  type="file" 
                  id={`upload-${form.id}`} 
                  className="hidden" 
                  accept={`.${form.type}`}
                  onChange={(e) => handleFileUpload(e, form.id, form.name, form.type)}
                />
                <label htmlFor={`upload-${form.id}`}>
                  <Button 
                    as="span" 
                    variant={isUploaded ? "outline" : "primary"} 
                    className="w-full rounded-2xl font-bold cursor-pointer h-12"
                    isLoading={isUploading}
                  >
                    {isUploaded ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Update File
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" /> Unggah Sekarang
                      </span>
                    )}
                  </Button>
                </label>
              </div>

              {isUploaded && (
                <div className="mt-4 text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 justify-center">
                   <CheckCircle2 className="w-3 h-3" /> Dokumen Sudah Aktif
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex gap-4 max-w-4xl mx-auto">
        <div className="p-3 bg-amber-100 rounded-2xl h-fit">
          <Upload className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 text-sm">Instruksi Penggunaan</h4>
          <p className="text-xs text-amber-800/80 leading-relaxed mt-1">
            Pastikan file Word (.docx) Anda sudah berisi placeholder seperti <b>{"{{nama_konsumen}}"}</b> sesuai panduan. 
            Sistem akan secara otomatis mengenali dokumen ini saat Anda melakukan transaksi penjualan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentTemplates;
