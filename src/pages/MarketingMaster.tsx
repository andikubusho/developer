import React, { useState, useEffect } from 'react';
import { Plus, Search, User, ArrowLeft, Edit, Trash2, Phone, MapPin, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { MarketingStaff } from '../types';
import { getMockData, saveMockData } from '../lib/storage';

const MarketingMaster: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [staff, setStaff] = useState<MarketingStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<MarketingStaff | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    position: '',
    address: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const defaultStaff: MarketingStaff[] = [
          { id: '1', name: 'Rina', address: 'Jl. Melati No. 123', phone: '081234567890', position: 'Senior Marketing' },
          { id: '2', name: 'Doni', address: 'Jl. Mawar No. 45', phone: '081234567891', position: 'Junior Marketing' }
        ];
        setStaff(getMockData<MarketingStaff>('marketing_staff', defaultStaff));
        return;
      }

      const { data, error } = await supabase
        .from('marketing_staff')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching marketing staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isMockMode) {
        const currentStaff = getMockData<MarketingStaff>('marketing_staff', []);
        let updatedStaff: MarketingStaff[];
        
        if (selectedStaff) {
          updatedStaff = currentStaff.map(s => s.id === selectedStaff.id ? { ...s, ...formData } : s);
        } else {
          const newStaff = {
            id: Math.random().toString(36).substr(2, 9),
            ...formData
          };
          updatedStaff = [newStaff, ...currentStaff];
        }
        
        saveMockData('marketing_staff', updatedStaff);
        setStaff(updatedStaff);
        setIsModalOpen(false);
        return;
      }

      if (selectedStaff) {
        const { error } = await supabase
          .from('marketing_staff')
          .update(formData)
          .eq('id', selectedStaff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_staff')
          .insert([formData]);
        if (error) throw error;
      }
      
      fetchStaff();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving marketing staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data marketing ini?')) return;
    
    if (isMockMode) {
      const updatedStaff = staff.filter(s => s.id !== id);
      setStaff(updatedStaff);
      saveMockData('marketing_staff', updatedStaff);
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_staff')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchStaff();
    } catch (error) {
      console.error('Error deleting marketing staff:', error);
    }
  };

  const handleEdit = (s: MarketingStaff) => {
    setSelectedStaff(s);
    setFormData({
      name: s.name,
      phone: s.phone,
      position: s.position,
      address: s.address
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedStaff(null);
    setFormData({
      name: '',
      phone: '',
      position: '',
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
            <h1 className="text-2xl font-bold text-slate-900">Master Marketing</h1>
            <p className="text-slate-500">Kelola data staf marketing</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Marketing
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama atau telepon..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Nama</th>
                <th className="px-6 py-3 font-semibold">No. Telp</th>
                <th className="px-6 py-3 font-semibold">Jabatan</th>
                <th className="px-6 py-3 font-semibold">Alamat</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data staf marketing.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {s.position}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {s.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(s)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(s.id)}
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
        onClose={() => setIsModalOpen(false)}
        title={selectedStaff ? "Edit Data Marketing" : "Input Data Marketing"}
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <Input 
            label="Nama" 
            placeholder="Nama lengkap" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input 
            label="No. Telp" 
            placeholder="0812..." 
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input 
            label="Jabatan" 
            placeholder="Contoh: Senior Marketing" 
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Alamat</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Alamat lengkap..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
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
