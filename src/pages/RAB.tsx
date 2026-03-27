import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calculator, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { RAB } from '../types';
import { formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const RABPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [rabItems, setRabItems] = useState<RAB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRAB, setSelectedRAB] = useState<RAB | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    quantity: 0,
    unit: '',
    unit_price: 0
  });

  useEffect(() => {
    fetchRAB();
  }, []);

  useEffect(() => {
    if (selectedRAB) {
      setFormData({
        category: selectedRAB.category,
        item_name: selectedRAB.item_name,
        quantity: selectedRAB.quantity,
        unit: selectedRAB.unit,
        unit_price: selectedRAB.unit_price
      });
    } else {
      setFormData({
        category: '',
        item_name: '',
        quantity: 0,
        unit: '',
        unit_price: 0
      });
    }
  }, [selectedRAB, isModalOpen]);

  const fetchRAB = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultRAB: RAB[] = [
        {
          id: '1',
          project_id: '1',
          item_name: 'Pekerjaan Tanah & Pasir',
          category: 'Persiapan',
          quantity: 1,
          unit: 'ls',
          unit_price: 5000000,
          total_price: 5000000,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          project_id: '1',
          item_name: 'Pemasangan Dinding Bata',
          category: 'Struktur',
          quantity: 120,
          unit: 'm2',
          unit_price: 150000,
          total_price: 18000000,
          created_at: new Date().toISOString()
        }
      ];
      setRabItems(getMockData<RAB>('rab', defaultRAB));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rab')
        .select('*')
        .order('category');
      if (error) throw error;
      setRabItems(data || []);
    } catch (error) {
      console.error('Error fetching RAB:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const total_price = formData.quantity * formData.unit_price;
    if (isMockMode) {
      let updatedRAB: RAB[];
      if (selectedRAB) {
        updatedRAB = rabItems.map(item => item.id === selectedRAB.id ? { ...item, ...formData, total_price } : item);
      } else {
        const newItem: RAB = {
          id: Math.random().toString(36).substr(2, 9),
          project_id: '1',
          ...formData,
          total_price,
          created_at: new Date().toISOString()
        };
        updatedRAB = [newItem, ...rabItems];
      }
      setRabItems(updatedRAB);
      saveMockData('rab', updatedRAB);
    } else {
      try {
        if (selectedRAB) {
          const { error } = await supabase
            .from('rab')
            .update({ ...formData, total_price })
            .eq('id', selectedRAB.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('rab')
            .insert([{ ...formData, total_price, project_id: '1' }]); // Fixed project_id for now
          if (error) throw error;
        }
        fetchRAB();
      } catch (error) {
        console.error('Error saving RAB:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleEdit = (item: RAB) => {
    setSelectedRAB(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    if (isMockMode) {
      const updatedRAB = rabItems.filter(item => item.id !== id);
      setRabItems(updatedRAB);
      saveMockData('rab', updatedRAB);
    } else {
      try {
        const { error } = await supabase
          .from('rab')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchRAB();
      } catch (error) {
        console.error('Error deleting RAB:', error);
      }
    }
  };

  const filteredRAB = rabItems.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">RAB Proyek</h1>
            <p className="text-slate-500">Rencana Anggaran Biaya Pembangunan</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setSelectedRAB(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Item RAB
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari item atau kategori..." 
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
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Item Pekerjaan</th>
                <th className="px-6 py-3 font-semibold text-right">Volume</th>
                <th className="px-6 py-3 font-semibold">Satuan</th>
                <th className="px-6 py-3 font-semibold text-right">Harga Satuan</th>
                <th className="px-6 py-3 font-semibold text-right">Total Harga</th>
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
              ) : filteredRAB.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data RAB.
                  </td>
                </tr>
              ) : (
                filteredRAB.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.item_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.total_price)}</td>
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
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right text-slate-900">Total RAB</td>
                <td className="px-6 py-4 text-right text-indigo-600">
                  {formatCurrency(filteredRAB.reduce((sum, item) => sum + item.total_price, 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRAB ? 'Edit Item RAB' : 'Tambah Item RAB'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Kategori" 
            placeholder="Contoh: Persiapan, Struktur, Finishing" 
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          />
          <Input 
            label="Item Pekerjaan" 
            placeholder="Nama pekerjaan" 
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Volume" 
              type="number" 
              placeholder="0" 
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input 
              label="Satuan" 
              placeholder="m2, m3, ls, dll" 
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>
          <Input 
            label="Harga Satuan" 
            type="number" 
            placeholder="Rp 0" 
            value={formData.unit_price}
            onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
            required
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RABPage;
