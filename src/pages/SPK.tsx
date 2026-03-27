import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, ArrowLeft, Edit, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { SPK } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';

const SPKPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [spks, setSpks] = useState<SPK[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    spk_number: '',
    contractor_name: '',
    work_description: '',
    total_value: 0,
    start_date: '',
    end_date: '',
    status: 'active' as const
  });

  useEffect(() => {
    fetchSPK();
  }, []);

  const fetchSPK = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const mockSPK: SPK[] = [
          {
            id: '1',
            spk_number: 'SPK/2026/03/001',
            project_id: '1',
            contractor_name: 'PT Bangun Sejahtera',
            work_description: 'Pekerjaan Struktur Lantai 1 & 2',
            total_value: 150000000,
            start_date: '2026-03-01',
            end_date: '2026-05-01',
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            spk_number: 'SPK/2026/03/002',
            project_id: '1',
            contractor_name: 'CV Listrik Mandiri',
            work_description: 'Instalasi Listrik & Titik Lampu',
            total_value: 25000000,
            start_date: '2026-03-15',
            end_date: '2026-04-15',
            status: 'active',
            created_at: new Date().toISOString()
          }
        ];
        setSpks(getMockData<SPK>('spks', mockSPK));
        return;
      }

      const { data, error } = await supabase
        .from('spks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpks(data || []);
    } catch (error) {
      console.error('Error fetching SPK:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const currentSPKs = getMockData<SPK>('spks', []);
        if (editingId) {
          const updatedSPKs = currentSPKs.map(s => s.id === editingId ? { ...s, ...formData } : s);
          saveMockData('spks', updatedSPKs);
          setSpks(updatedSPKs);
        } else {
          const newSPK: SPK = {
            id: Math.random().toString(36).substr(2, 9),
            project_id: '1',
            ...formData,
            created_at: new Date().toISOString()
          };
          const updatedSPKs = [newSPK, ...currentSPKs];
          saveMockData('spks', updatedSPKs);
          setSpks(updatedSPKs);
        }
        setIsModalOpen(false);
        resetForm();
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('spks')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('spks')
          .insert([{ ...formData, project_id: '1' }]);
        if (error) throw error;
      }

      fetchSPK();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving SPK:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (spk: SPK) => {
    setEditingId(spk.id);
    setFormData({
      spk_number: spk.spk_number,
      contractor_name: spk.contractor_name,
      work_description: spk.work_description,
      total_value: spk.total_value,
      start_date: spk.start_date,
      end_date: spk.end_date,
      status: spk.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus SPK ini?')) return;
    
    try {
      setLoading(true);
      if (isMockMode) {
        const currentSPKs = getMockData<SPK>('spks', []);
        const updatedSPKs = currentSPKs.filter(s => s.id !== id);
        saveMockData('spks', updatedSPKs);
        setSpks(updatedSPKs);
        return;
      }

      const { error } = await supabase
        .from('spks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSPK();
    } catch (error) {
      console.error('Error deleting SPK:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      spk_number: '',
      contractor_name: '',
      work_description: '',
      total_value: 0,
      start_date: '',
      end_date: '',
      status: 'active'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredSPK = spks.filter(item => 
    item.spk_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.work_description.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">SPK Kontraktor</h1>
            <p className="text-slate-500">Surat Perintah Kerja untuk Kontraktor/Sub-kon</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Buat SPK Baru
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nomor SPK, kontraktor, atau pekerjaan..." 
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">No. SPK</th>
                <th className="px-6 py-3 font-semibold">Kontraktor</th>
                <th className="px-6 py-3 font-semibold">Pekerjaan</th>
                <th className="px-6 py-3 font-semibold text-right">Nilai Kontrak</th>
                <th className="px-6 py-3 font-semibold">Periode</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredSPK.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data SPK.
                  </td>
                </tr>
              ) : (
                filteredSPK.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{item.spk_number}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.contractor_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.work_description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.total_value)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(item.start_date)} - {formatDate(item.end_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(item.status)
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600">
                           <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? "Edit SPK" : "Buat SPK Baru"}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Nomor SPK" 
            placeholder="SPK/YYYY/MM/XXX" 
            value={formData.spk_number}
            onChange={(e) => setFormData({ ...formData, spk_number: e.target.value })}
            required
          />
          <Input 
            label="Nama Kontraktor / Vendor" 
            placeholder="Contoh: PT Bangun Sejahtera" 
            value={formData.contractor_name}
            onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Deskripsi Pekerjaan</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Isi rincian pekerjaan yang diperintahkan..."
              value={formData.work_description}
              onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
              required
            />
          </div>
          <Input 
            label="Nilai Kontrak (Rp)" 
            type="number" 
            placeholder="Rp 0" 
            value={formData.total_value}
            onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tanggal Mulai" 
              type="date" 
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <Input 
              label="Tanggal Selesai" 
              type="date" 
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit">{editingId ? "Update SPK" : "Simpan SPK"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SPKPage;
