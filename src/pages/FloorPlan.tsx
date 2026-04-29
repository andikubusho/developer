import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Upload, Printer, ArrowLeft, Trash2, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingDocument } from '../types';
import { formatDate } from '../lib/utils';
import { api } from '../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FloorPlan: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [docs, setDocs] = useState<MarketingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const data = await api.get('marketing_documents', 'select=*&type=eq.denah&order=id.desc');
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
      await api.delete('marketing_documents', id);
      await fetchDocs();
    } catch (error: any) {
      console.error('Error deleting doc:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Hanya file PDF yang diperbolehkan.');
      return;
    }

    try {
      setLoading(true);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const fileUrl = await api.storage.upload('marketing-docs', `denah/${fileName}`, file);

      await api.insert('marketing_documents', {
        type: 'denah',
        name: file.name.replace('.pdf', '').replace('.PDF', ''),
        file_url: fileUrl,
      });

      await fetchDocs();
      setIsModalOpen(false);
      alert('Berhasil mengunggah denah!');
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Gagal upload: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (url: string) => {
    if (!url || url === '#') return;
    window.open(url, '_blank');
  };

  const handleDownload = (url: string, name: string) => {
    if (!url || url === '#') return;
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (docs.length === 0) return;
    
    const doc = new jsPDF();
    doc.text('DAFTAR DOKUMEN DENAH RUMAH', 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nama Dokumen', 'Tanggal Upload']],
      body: docs.map(d => [d.name, formatDate(d.created_at)]),
      headStyles: { fillColor: [16, 185, 129] }, // Emerald-600
    });
    
    doc.save(`Daftar-Denah-${new Date().toLocaleDateString('id-ID')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Denah Rumah</h1>
            <p className="text-text-secondary">Detail tata ruang unit properti</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportPDF} disabled={docs.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Export List (PDF)
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Upload PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-text-muted">Memuat data...</div>
        ) : docs.length === 0 ? (
          <div className="col-span-full py-20 text-center text-text-secondary">Belum ada dokumen denah.</div>
        ) : (
          docs.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl"><Layout className="w-6 h-6 text-emerald-600" /></div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-text-primary truncate">{doc.name}</h3>
                  <p className="text-xs text-text-secondary mt-1">Diunggah pada {formatDate(doc.created_at)}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint(doc.file_url)}><Printer className="w-3 h-3 mr-2" />Lihat</Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(doc.file_url, doc.name)}><Download className="w-3 h-3 mr-2" />Download</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(doc.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Denah">
        <div className="space-y-4">
          <label className="border-2 border-dashed border-white/40 rounded-xl p-8 text-center hover:border-accent-lavender cursor-pointer block">
            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
            <Upload className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <p className="text-sm font-medium">Klik untuk memilih file PDF denah</p>
            <p className="text-xs text-text-muted mt-2">Maksimal file 5MB</p>
          </label>
          <div className="flex justify-end pt-4"><Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button></div>
        </div>
      </Modal>
    </div>
  );
};

export default FloorPlan;
