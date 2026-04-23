import React, { useState, useEffect } from 'react';
import { Layout, Upload, Printer, ArrowLeft, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingDocument } from '../types';
import { formatDate } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';

const FloorPlan: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [docs, setDocs] = useState<MarketingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const defaultDocs: MarketingDocument[] = [
          {
            id: '1',
            type: 'denah',
            name: 'Denah Tipe 36 - Griya Asri.pdf',
            file_url: '#',
            created_at: new Date().toISOString()
          }
        ];
        const allDocs = getMockData<MarketingDocument>('marketing_documents', defaultDocs);
        setDocs(allDocs.filter(d => d.type === 'denah'));
        return;
      }

      const { data, error } = await supabase
        .from('marketing_documents')
        .select('*')
        .eq('type', 'denah')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error('Error fetching docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
    
    try {
      setLoading(true);
      if (isMockMode) {
        const allDocs = getMockData<MarketingDocument>('marketing_documents', []);
        const updatedDocs = allDocs.filter(d => d.id !== id);
        saveMockData('marketing_documents', updatedDocs);
        setDocs(updatedDocs.filter(d => d.type === 'denah'));
        return;
      }

      const { error } = await supabase
        .from('marketing_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDocs();
    } catch (error) {
      console.error('Error deleting doc:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Denah Rumah</h1>
            <p className="text-slate-500">Detail tata ruang unit properti</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : docs.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            Belum ada dokumen denah.
          </div>
        ) : (
          docs.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <Layout className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-slate-900 truncate">{doc.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">Diunggah pada {formatDate(doc.created_at)}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Printer className="w-3 h-3 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="w-3 h-3 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Denah"
      >
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer"
            onClick={async () => {
              const name = prompt('Masukkan nama file:', `Denah Tipe ${new Date().toLocaleDateString('id-ID')}.pdf`);
              if (!name) return;
              
              const newDoc = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'denah',
                name: name,
                file_url: '#',
                created_at: new Date().toISOString()
              };

              if (isMockMode) {
                const allDocs = getMockData<MarketingDocument>('marketing_documents', []);
                saveMockData('marketing_documents', [newDoc, ...allDocs]);
                fetchDocs();
              } else {
                await supabase.from('marketing_documents').insert([newDoc]);
                fetchDocs();
              }
              setIsModalOpen(false);
            }}
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-900">Klik untuk simulasi upload PDF</p>
            <p className="text-xs text-slate-500 mt-1">Maksimal ukuran file 10MB</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FloorPlan;

