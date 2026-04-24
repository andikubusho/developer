import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { Deposit, Lead } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';

const Deposits: React.FC = () => {
  const { setDivision } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    phone: '',
    amount: 0,
    payment_type: 'cash' as 'cash' | 'bank',
    submission: '',
    description: '',
    marketing_id: ''
  });
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchDeposits();
    fetchLeads();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await api.get('marketing_staff', 'select=id,name&order=name.asc');
      setStaff(data || []);
    } catch (err) {
      console.error('Fetch Staff Failed:', err);
    }
  };

  useEffect(() => {
    if (selectedDeposit) {
      setFormData({
        date: selectedDeposit.date.split('T')[0],
        name: selectedDeposit.name,
        phone: selectedDeposit.phone,
        amount: selectedDeposit.amount,
        payment_type: selectedDeposit.payment_type,
        submission: selectedDeposit.submission,
        description: selectedDeposit.description || '',
        marketing_id: (selectedDeposit as any).marketing_id || ''
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        name: '',
        phone: '',
        amount: 0,
        payment_type: 'cash',
        submission: '',
        description: '',
        marketing_id: ''
      });
    }
  }, [selectedDeposit, isModalOpen]);

  const fetchLeads = async () => {
    try {
      const data = await api.get('leads', 'select=*&order=name.asc');
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const data = await api.get('deposits', 'select=*,marketing:marketing_staff(name)&order=created_at.desc');
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
    try {
      setLoading(true);
      const payload = {
        date: formData.date,
        name: formData.name,
        phone: formData.phone,
        amount: formData.amount,
        payment_type: formData.payment_type,
        submission: formData.submission,
        marketing_id: formData.marketing_id || null,
        // description: formData.description // Temporarily disabled: column missing in DB
      };
      if (selectedDeposit) {
        await api.update('deposits', selectedDeposit.id, payload);
      } else {
        await api.insert('deposits', payload);
      }
      await fetchDeposits();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving deposit:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      setLoading(true);
      await api.delete('deposits', id);
      await fetchDeposits();
    } catch (error: any) {
      console.error('Error deleting deposit:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
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
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Titipan</h1>
            <p className="text-slate-500">Kelola dana titipan konsumen sebelum SPK</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Input Titipan
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nama atau telepon..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Nama</th>
                <th className="px-6 py-3 font-semibold">No. Telp</th>
                <th className="px-6 py-3 font-semibold">Marketing</th>
                <th className="px-6 py-3 font-semibold">Nilai Titipan</th>
                <th className="px-6 py-3 font-semibold">Metode</th>
                <th className="px-6 py-3 font-semibold">Pengajuan</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : filteredDeposits.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">Tidak ada data titipan.</td></tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(d.date)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{d.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{d.phone}</td>
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600">
                      {(d as any).marketing?.name || '-'}
                    </td>
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
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(d)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedDeposit ? 'Edit Titipan' : 'Input Titipan'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label="Tanggal" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Calon Konsumen (Opsional)</label>
            <select className="w-full h-10 rounded-lg border border-slate-300 p-2 text-sm" onChange={(e) => handleLeadSelect(e.target.value)} value="">
              <option value="">-- Pilih Konsumen --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Marketing</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 p-2 text-sm" 
              value={formData.marketing_id}
              onChange={(e) => setFormData({ ...formData, marketing_id: e.target.value })}
            >
              <option value="">-- Pilih Marketing --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input label="Nama" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="No. Telp" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
          <CurrencyInput label="Nilai Titipan" value={formData.amount} onValueChange={(values) => setFormData({ ...formData, amount: values.floatValue || 0 })} required />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Metode Pembayaran</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.payment_type === 'cash'} onChange={() => setFormData({ ...formData, payment_type: 'cash' })} /> Cash
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.payment_type === 'bank'} onChange={() => setFormData({ ...formData, payment_type: 'bank' })} /> Bank
              </label>
            </div>
          </div>
          <Input label="Pengajuan" value={formData.submission} onChange={(e) => setFormData({ ...formData, submission: e.target.value })} required />
          <textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Catatan..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Deposits;
