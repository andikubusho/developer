import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Wallet, ArrowLeft, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Deposit, Lead } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData, saveMockData } from '../lib/storage';

const Deposits: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    phone: '',
    amount: 0,
    payment_type: 'cash' as 'cash' | 'bank',
    submission: '',
    description: ''
  });

  useEffect(() => {
    if (division === 'marketing') {
      fetchDeposits();
      fetchLeads();
    } else {
      setLoading(false);
    }
  }, [division]);

  useEffect(() => {
    if (selectedDeposit) {
      setFormData({
        date: selectedDeposit.date.split('T')[0],
        name: selectedDeposit.name,
        phone: selectedDeposit.phone,
        amount: selectedDeposit.amount,
        payment_type: selectedDeposit.payment_type,
        submission: selectedDeposit.submission,
        description: selectedDeposit.description
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        name: '',
        phone: '',
        amount: 0,
        payment_type: 'cash',
        submission: '',
        description: ''
      });
    }
  }, [selectedDeposit, isModalOpen]);

  const fetchLeads = async () => {
    if (isMockMode) {
      const defaultLeads: Lead[] = [
        { id: '1', name: 'Andi Wijaya', phone: '081234567890', date: '', source: '', status: 'hot', description: '' },
        { id: '2', name: 'Budi Santoso', phone: '089876543210', date: '', source: '', status: 'medium', description: '' }
      ];
      setLeads(getMockData<Lead>('leads', defaultLeads));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('name');
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchDeposits = async () => {
    setLoading(true);
    if (isMockMode) {
      const defaultDeposits: Deposit[] = [
        {
          id: '1',
          date: new Date().toISOString(),
          name: 'Andi Wijaya',
          phone: '081234567890',
          amount: 5000000,
          payment_type: 'cash',
          submission: 'Pengajuan Unit A-01',
          description: 'Titipan booking fee sementara'
        }
      ];
      const data = getMockData<Deposit>('deposits', defaultDeposits);
      setDeposits(data);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeposits = deposits.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm)
  );

  const handleAdd = () => {
    setSelectedDeposit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isMockMode) {
      let updatedDeposits: Deposit[];
      if (selectedDeposit) {
        // Update
        updatedDeposits = deposits.map(d => d.id === selectedDeposit.id ? { ...d, ...formData } : d);
      } else {
        // Create
        const newDeposit: Deposit = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData
        };
        updatedDeposits = [newDeposit, ...deposits];
      }
      setDeposits(updatedDeposits);
      saveMockData('deposits', updatedDeposits);
    } else {
      try {
        if (selectedDeposit) {
          const { error } = await supabase
            .from('deposits')
            .update(formData)
            .eq('id', selectedDeposit.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('deposits')
            .insert([formData]);
          if (error) throw error;
        }
        fetchDeposits();
      } catch (error) {
        console.error('Error saving deposit:', error);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    if (isMockMode) {
      const updatedDeposits = deposits.filter(item => item.id !== id);
      setDeposits(updatedDeposits);
      saveMockData('deposits', updatedDeposits);
    } else {
      try {
        const { error } = await supabase
          .from('deposits')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchDeposits();
      } catch (error) {
        console.error('Error deleting deposit:', error);
      }
    }
  };

  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setFormData({
        ...formData,
        name: lead.name,
        phone: lead.phone
      });
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
            <h1 className="text-2xl font-bold text-slate-900">Titipan</h1>
            <p className="text-slate-500">Kelola dana titipan konsumen sebelum SPK</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Input Titipan
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
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Nama</th>
                <th className="px-6 py-3 font-semibold">No. Telp</th>
                <th className="px-6 py-3 font-semibold">Nilai Titipan</th>
                <th className="px-6 py-3 font-semibold">Metode</th>
                <th className="px-6 py-3 font-semibold">Pengajuan</th>
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
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data titipan.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(d.date)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{d.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{d.phone}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(d.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        d.payment_type === 'cash' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                      )}>
                        {d.payment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{d.submission}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(d)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(d.id)}>
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
        title={selectedDeposit ? 'Edit Titipan' : 'Input Titipan'}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input 
            label="Tanggal" 
            type="date" 
            value={formData.date} 
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Calon Konsumen (Opsional)</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => handleLeadSelect(e.target.value)}
              value=""
            >
              <option value="">-- Pilih Konsumen --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
              ))}
            </select>
          </div>
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
          <CurrencyInput 
            label="Nilai Titipan" 
            placeholder="Rp 0" 
            value={formData.amount}
            onChange={(val) => setFormData({ ...formData, amount: val })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Metode Pembayaran</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="payment_type" 
                  value="cash" 
                  className="w-4 h-4 text-indigo-600" 
                  checked={formData.payment_type === 'cash'}
                  onChange={() => setFormData({ ...formData, payment_type: 'cash' })}
                />
                <span className="text-sm text-slate-600">Cash</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="payment_type" 
                  value="bank" 
                  className="w-4 h-4 text-indigo-600" 
                  checked={formData.payment_type === 'bank'}
                  onChange={() => setFormData({ ...formData, payment_type: 'bank' })}
                />
                <span className="text-sm text-slate-600">Bank</span>
              </label>
            </div>
          </div>
          <Input 
            label="Pengajuan" 
            placeholder="Contoh: Unit A-01" 
            value={formData.submission}
            onChange={(e) => setFormData({ ...formData, submission: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Keterangan</label>
            <textarea 
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Catatan tambahan..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Titipan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Deposits;



