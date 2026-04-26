import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowLeft, Edit, Trash2, Camera, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { ConstructionProgress } from '../types';
import { formatDate } from '../lib/utils';
import { api } from '../lib/api';

const ConstructionProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [progressItems, setProgressItems] = useState<ConstructionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<ConstructionProgress | null>(null);

  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    unit_id: '',
    percentage: 0,
    description: '',
    photo_url: ''
  });

  useEffect(() => {
    fetchProgress();
  }, []);

  useEffect(() => {
    if (selectedProgress) {
      setFormData({
        report_date: selectedProgress.report_date.split('T')[0],
        unit_id: selectedProgress.unit_id,
        percentage: selectedProgress.percentage,
        description: selectedProgress.description,
        photo_url: selectedProgress.photo_url || ''
      });
    } else {
      setFormData({
        report_date: new Date().toISOString().split('T')[0],
        unit_id: '',
        percentage: 0,
        description: '',
        photo_url: ''
      });
    }
  }, [selectedProgress, isModalOpen]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      // CORRECT TABLE NAME: construction_progress
      const data = await api.get('construction_progress', 'select=*&order=report_date.desc');
      setProgressItems(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        ...formData,
        project_id: '1',
        created_by: 'Admin'
      };

      if (selectedProgress) {
        await api.update('construction_progress', selectedProgress.id, payload);
      } else {
        await api.insert('construction_progress', payload);
      }
      await fetchProgress();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving progress:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ConstructionProgress) => {
    setSelectedProgress(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      setLoading(true);
      await api.delete('construction_progress', id);
      await fetchProgress();
    } catch (error: any) {
      console.error('Error deleting progress:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProgress = progressItems.filter(item => 
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-1 sm:p-2 h-auto">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight">Progress Bangun</h1>
            <p className="text-[10px] sm:text-sm text-text-secondary font-medium uppercase tracking-widest">Laporan Lapangan</p>
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto rounded-xl text-[10px] sm:text-sm py-3" onClick={() => { setSelectedProgress(null); setIsModalOpen(true); }}>
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Input Laporan
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari deskripsi..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
              <THead>
                <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                  <TH className="px-3 py-3 font-black">Laporan</TH>
                  <TH className="px-3 py-3 font-black">Progress</TH>
                  <TH className="px-3 py-3 font-black hidden sm:table-cell">Foto</TH>
                  <TH className="px-3 py-3 font-black text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-muted">Memuat...</TD></TR>
                ) : filteredProgress.length === 0 ? (
                  <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-secondary text-sm">Tidak ada laporan.</TD></TR>
                ) : (
                  filteredProgress.map((item) => (
                    <TR key={item.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-3 py-4">
                        <div className="text-[10px] text-text-secondary whitespace-nowrap">{formatDate(item.report_date)}</div>
                        <div className="text-[11px] font-black text-text-primary">Unit: {item.unit_id}</div>
                      </TD>
                      <TD className="px-3 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 bg-white/40 rounded-full h-1"><div className="bg-accent-dark h-1 rounded-full" style={{ width: `${item.percentage}%` }}></div></div>
                          <span className="text-[10px] font-black">{item.percentage}%</span>
                        </div>
                        <div className="sm:hidden mt-1">
                          {item.photo_url ? <img src={item.photo_url} alt="Progress" className="w-6 h-6 rounded-lg object-cover" /> : <Camera className="w-3 h-3 text-text-muted" />}
                        </div>
                      </TD>
                      <TD className="px-3 py-4 hidden sm:table-cell">
                        {item.photo_url ? <img src={item.photo_url} alt="Progress" className="w-8 h-8 rounded-lg object-cover" /> : <Camera className="w-3.5 h-3.5 text-text-muted" />}
                      </TD>
                      <TD className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(item)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProgress ? 'Edit Laporan' : 'Input Laporan'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label="Tanggal Laporan" type="date" value={formData.report_date} onChange={(e) => setFormData({ ...formData, report_date: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit ID" value={formData.unit_id} onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })} required />
            <Input label="Progress (%)" type="number" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })} required />
          </div>
          <textarea className="w-full rounded-xl border border-white/60 p-2 text-sm" placeholder="Keterangan..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          <Input label="Foto URL" value={formData.photo_url} onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ConstructionProgressPage;
