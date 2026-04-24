import React, { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft, Edit, Trash2, Phone, MapPin, Briefcase } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingStaff } from '../types';
import { api } from '../lib/api';

const MarketingMaster: React.FC = () => {
  const { setDivision } = useAuth();
  const [staff, setStaff] = useState<MarketingStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<MarketingStaff | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.get('marketing_staff', 'select=*&order=name.asc');
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching marketing staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      };
      if (selectedStaff) {
        await api.update('marketing_staff', selectedStaff.id, payload);
      } else {
        await api.insert('marketing_staff', payload);
      }
      await fetchStaff();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving marketing staff:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data marketing ini?')) return;
    try {
      setLoading(true);
      await api.delete('marketing_staff', id);
      await fetchStaff();
    } catch (error: any) {
      console.error('Error deleting marketing staff:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s: MarketingStaff) => {
    setSelectedStaff(s);
    setFormData({
      name: s.name,
      phone: s.phone,
      address: s.address
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedStaff(null);
    setFormData({
      name: '',
      phone: '',
      address: ''
    });
    setIsModalOpen(true);
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Marketing</h1>
            <p className="text-slate-500">Kelola data staf marketing</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Marketing
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Cari nama atau telepon..." 
              className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Nama</th>
                <th className="px-6 py-3 font-semibold">No. Telp</th>
                <th className="px-6 py-3 font-semibold">Alamat</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">Tidak ada data staf marketing.</td></tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-slate-400" />{s.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-3 h-3 text-slate-400" />{s.address}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedStaff ? "Edit Data Marketing" : "Input Data Marketing"}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Input label="Nama" placeholder="Nama lengkap" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="No. Telp" placeholder="0812..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Alamat</label>
            <textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm" rows={3} placeholder="Alamat lengkap..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Data</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketingMaster;
