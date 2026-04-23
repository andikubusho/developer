import React, { useState, useEffect } from 'react';
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Progress Bangun</h1>
            <p className="text-slate-500">Laporan Progress Pembangunan Unit & Proyek</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setSelectedProgress(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Input Laporan Progress
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari deskripsi..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Unit</th>
                <th className="px-6 py-3 font-semibold">Progress (%)</th>
                <th className="px-6 py-3 font-semibold">Keterangan</th>
                <th className="px-6 py-3 font-semibold">Foto</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : filteredProgress.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">Tidak ada laporan ditemukan.</td></tr>
              ) : (
                filteredProgress.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600"><Clock className="w-3 h-3 inline mr-1" />{formatDate(item.report_date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.unit_id}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 max-w-[100px] inline-block mr-2"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div></div>
                      <span className="text-xs font-bold">{item.percentage}%</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4">
                      {item.photo_url ? <img src={item.photo_url} alt="Progress" className="w-10 h-10 rounded object-cover" /> : <Camera className="w-4 h-4 text-slate-300" />}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProgress ? 'Edit Laporan' : 'Input Laporan'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label="Tanggal Laporan" type="date" value={formData.report_date} onChange={(e) => setFormData({ ...formData, report_date: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit ID" value={formData.unit_id} onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })} required />
            <Input label="Progress (%)" type="number" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })} required />
          </div>
          <textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Keterangan..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
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
