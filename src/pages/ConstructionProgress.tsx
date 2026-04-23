import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, HardHat, ArrowLeft, Edit, Trash2, Camera, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { ConstructionProgress } from '../types';
import { formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const ConstructionProgressPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [progressItems, setProgressItems] = useState<ConstructionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<ConstructionProgress | null>(null);

  // Form State
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
    setLoading(true);
    if (isMockMode) {
      const defaultProgress: ConstructionProgress[] = [
        {
          id: '1',
          project_id: '1',
          unit_id: '1',
          percentage: 45,
          description: 'Pekerjaan dinding lantai 1 selesai, persiapan pengecoran dak.',
          photo_url: 'https://picsum.photos/seed/construction1/800/600',
          report_date: new Date().toISOString(),
          created_by: 'Neville Christian'
        },
        {
          id: '2',
          project_id: '1',
          unit_id: '2',
          percentage: 20,
          description: 'Pondasi selesai, mulai pemasangan bata.',
          photo_url: 'https://picsum.photos/seed/construction2/800/600',
          report_date: new Date().toISOString(),
          created_by: 'Neville Christian'
        }
      ];
      setProgressItems(getMockData<ConstructionProgress>('construction_progress', defaultProgress));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('construction_progress')
        .select('*')
        .order('report_date', { ascending: false });
      if (error) throw error;
      setProgressItems(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isMockMode) {
      let updatedProgress: ConstructionProgress[];
      if (selectedProgress) {
        updatedProgress = progressItems.map(item => item.id === selectedProgress.id ? { ...item, ...formData } : item);
      } else {
        const newItem: ConstructionProgress = {
          id: Math.random().toString(36).substr(2, 9),
          project_id: '1',
          ...formData,
          created_by: 'Neville Christian'
        };
        updatedProgress = [newItem, ...progressItems];
      }
      setProgressItems(updatedProgress);
      saveMockData('construction_progress', updatedProgress);
    } else {
      try {
        if (selectedProgress) {
          const { error } = await supabase
            .from('construction_progress')
            .update(formData)
            .eq('id', selectedProgress.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('construction_progress')
            .insert([{ ...formData, project_id: '1', created_by: 'Neville Christian' }]);
          if (error) throw error;
        }
        fetchProgress();
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleEdit = (item: ConstructionProgress) => {
    setSelectedProgress(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    if (isMockMode) {
      const updatedProgress = progressItems.filter(item => item.id !== id);
      setProgressItems(updatedProgress);
      saveMockData('construction_progress', updatedProgress);
    } else {
      try {
        const { error } = await supabase
          .from('construction_progress')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchProgress();
      } catch (error) {
        console.error('Error deleting progress:', error);
      }
    }
  };

  const filteredProgress = progressItems.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-slate-900">Progress Bangun</h1>
            <p className="text-slate-500">Laporan Progress Pembangunan Unit & Proyek</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setSelectedProgress(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Input Laporan Progress
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari deskripsi laporan..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
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
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredProgress.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada laporan progress.
                  </td>
                </tr>
              ) : (
                filteredProgress.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDate(item.report_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">Unit A-0{item.unit_id}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-[100px]">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 mt-1 block">{item.percentage}%</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4">
                      {item.photo_url ? (
                        <img 
                          src={item.photo_url} 
                          alt="Progress" 
                          className="w-10 h-10 rounded object-cover cursor-pointer hover:scale-110 transition-transform" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                          <Camera className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProgress ? 'Edit Laporan Progress' : 'Input Laporan Progress'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal Laporan" 
            type="date" 
            value={formData.report_date}
            onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Unit</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                required
              >
                <option value="">-- Pilih Unit --</option>
                <option value="1">Unit A-01</option>
                <option value="2">Unit A-02</option>
              </select>
            </div>
            <Input 
              label="Progress (%)" 
              type="number" 
              placeholder="0" 
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Keterangan Pekerjaan</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Isi rincian pekerjaan yang sudah selesai..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Foto Progress (URL)</label>
            <Input 
              placeholder="https://..." 
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">*Gunakan URL gambar untuk demo</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Laporan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ConstructionProgressPage;



