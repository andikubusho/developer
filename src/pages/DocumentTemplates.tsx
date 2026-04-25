import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Upload, CheckCircle2, FileSpreadsheet, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
}

const DocumentTemplates: React.FC = () => {
  const navigate = useNavigate();
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
    { id: 'rincian_harga', name: 'SURAT PERSETUJUAN RINCIAN HARGA JUAL', type: 'docx' },
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

  const handleDownload = (formId: string) => {
    const template = templates[formId];
    if (!template || !template.content) return;

    try {
      // Convert base64 to blob
      const byteCharacters = atob(template.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      const form = REQUIRED_FORMS.find(f => f.id === formId);
      const mimeType = form?.type === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        
      const blob = new Blob([byteArray], { type: mimeType });
      saveAs(blob, `${template.name}.${form?.type || 'docx'}`);
    } catch (error) {
      console.error('Download Error:', error);
      alert('Gagal mengunduh file.');
    }
  };

  return (
    <div className="space-y-10 pb-20 pt-6">
      <div className="flex items-center gap-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-3 h-auto rounded-2xl bg-white shadow-sm border border-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Manajemen Template Form</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Standar Administrasi Perusahaan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {REQUIRED_FORMS.map((form) => {
          const isUploaded = !!templates[form.id];
          const isUploading = uploadingId === form.id;

          return (
            <Card key={form.id} className={cn(
              "p-10 border-none shadow-premium rounded-[3rem] transition-all flex flex-col items-center text-center group",
              isUploaded ? "bg-white" : "bg-slate-50/50 border-2 border-dashed border-slate-200"
            )}>
              <div className={cn(
                "p-6 rounded-[1.5rem] mb-8 transition-all shadow-sm",
                isUploaded ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-100 text-slate-300"
              )}>
                {form.type === 'xlsx' ? <FileSpreadsheet className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
              </div>
              
              <h3 className="font-black text-slate-900 mb-2 leading-tight text-lg px-2 min-h-[3.5rem] flex items-center justify-center">
                {form.name}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Format: .{form.type}</p>
              
              <div className="mt-auto w-full">
                <input 
                  type="file" 
                  id={`upload-${form.id}`} 
                  className="hidden" 
                  accept={`.${form.type}`}
                  onChange={(e) => handleFileUpload(e, form.id, form.name, form.type)}
                />
                <label htmlFor={`upload-${form.id}`} className="block w-full">
                  <Button 
                    as="span" 
                    variant={isUploaded ? "outline" : "primary"} 
                    className="w-full rounded-[1.2rem] font-black h-16 shadow-lg tracking-widest text-xs cursor-pointer"
                    isLoading={isUploading}
                  >
                    {isUploaded ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> UPDATE DOKUMEN
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5" /> UNGGAH FILE
                      </span>
                    )}
                  </Button>
                </label>
                
                {isUploaded && (
                  <Button 
                    variant="ghost"
                    onClick={() => handleDownload(form.id)}
                    className="w-full mt-3 rounded-[1.2rem] font-black h-12 text-indigo-600 hover:bg-indigo-50 tracking-widest text-[10px] border border-indigo-100"
                  >
                    <Download className="w-4 h-4 mr-2" /> UNDUH MASTER FILE
                  </Button>
                )}
              </div>

              {isUploaded && (
                <div className="mt-6 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> File Siap Digunakan
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentTemplates;
