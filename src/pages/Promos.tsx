import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Tag, ArrowLeft, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Promo } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const Promos: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    valid_until: '',
    value: 0,
    description: ''
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultPromos: Promo[] = [
        {
          id: '1',
          name: 'Promo Ramadhan',
          valid_until: '2026-04-30',
          value: 10000000,
          description: 'Potongan harga langsung 10jt'
        },
        {
          id: '2',
          name: 'Free Biaya KPR',
          valid_until: '2026-12-31',
          value: 0,
          description: 'Gratis biaya administrasi KPR'
        }
      ];
      setPromos(getMockData<Promo>('promos', defaultPromos));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .order('name');
      if (error) throw error;
      setPromos(data || []);
    } catch (error) {
      console.error('Error fetching promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isMockMode) {
      let updatedPromos: Promo[];
      if (selectedPromo) {
        updatedPromos = promos.map(p => p.id === selectedPromo.id ? { ...p, ...formData } : p);
      } else {
        const newPromo: Promo = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData
        };
        updatedPromos = [newPromo, ...promos];
      }
      setPromos(updatedPromos);
      saveMockData('promos', updatedPromos);
      setIsModalOpen(false);
      resetForm();
    } else {
      try {
        if (selectedPromo) {
          const { error } = await supabase
            .from('promos')
            .update(formData)
            .eq('id', selectedPromo.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('promos')
            .insert([formData]);
          if (error) throw error;
        }
        fetchPromos();
        setIsModalOpen(false);
        resetForm();
      } catch (error) {
        console.error('Error saving promo:', error);
      }
    }
  };

  const handleEdit = (promo: Promo) => {
    setSelectedPromo(promo);
    setFormData({
      name: promo.name,
      valid_until: promo.valid_until,
      value: promo.value,
      description: promo.description
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus promo ini?')) return;

    if (isMockMode) {
      const updatedPromos = promos.filter(p => p.id !== id);
      setPromos(updatedPromos);
      saveMockData('promos', updatedPromos);
    } else {
      try {
        const { error } = await supabase
          .from('promos')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchPromos();
      } catch (error) {
        console.error('Error deleting promo:', error);
      }
    }
  };

  const resetForm = () => {
    setSelectedPromo(null);
    setFormData({
      name: '',
      valid_until: '',
      value: 0,
      description: ''
    });
  };

  const filteredPromos = promos.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedPromo(null);
    setIsModalOpen(true);
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
            <h1 className="text-2xl font-bold text-slate-900">Master Promo</h1>
            <p className="text-slate-500">Kelola daftar promo penjualan</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Promo
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama promo..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Nama Promo</th>
                <th className="px-6 py-3 font-semibold">Masa Berlaku</th>
                <th className="px-6 py-3 font-semibold">Nilai Promo</th>
                <th className="px-6 py-3 font-semibold">Keterangan</th>
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
              ) : filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data promo.
                  </td>
                </tr>
              ) : (
                filteredPromos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(p.valid_until)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                      {p.value > 0 ? formatCurrency(p.value) : 'Non-Moneter'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.description}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedPromo ? "Edit Promo" : "Input Promo"}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Nama Promo" 
            placeholder="Contoh: Promo Akhir Tahun" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input 
            label="Masa Berlaku" 
            type="date" 
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            required
          />
          <CurrencyInput 
            label="Nilai Promo" 
            placeholder="Rp 0 (Isi 0 jika non-moneter)" 
            value={formData.value}
            onChange={(val) => setFormData({ ...formData, value: val })}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Keterangan Promo</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Detail promo..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit">Simpan Promo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Promos;


