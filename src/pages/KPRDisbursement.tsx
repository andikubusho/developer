import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Banknote, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { KPRDisbursement, Sale } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

const KPRDisbursementPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [disbursements, setDisbursements] = useState<KPRDisbursement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sale_id: '',
    bank_name: '',
    amount: 0,
    disbursement_date: '',
    stage: 1,
    status: 'pending' as const
  });

  useEffect(() => {
    fetchDisbursements();
    fetchSales();
  }, []);

  const fetchDisbursements = async () => {
    try {
      setLoading(true);
      const data = await api.get('kpr_disbursement', 'select=*,sale:sales(customer:customers(full_name),unit:units(unit_number))&order=created_at.desc');
      console.log('🔍 KPR DATA STRUCTURE:', data?.[0]);
      setDisbursements(data || []);
    } catch (error) {
      console.error('Error fetching disbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const data = await api.get('sales', 'select=*,customer:customers(full_name),unit:units(unit_number)&payment_method=eq.kpr');
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.insert('kpr_disbursement', formData);
      await fetchDisbursements();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving disbursement:', error);
      alert('Gagal menyimpan pencairan KPR');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      setLoading(true);
      await api.delete('kpr_disbursement', id);
      await fetchDisbursements();
    } catch (error) {
      console.error('Error deleting disbursement:', error);
      alert('Gagal menghapus pencairan');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'received') => {
    try {
      setLoading(true);
      await api.update('kpr_disbursement', id, { status });
      await fetchDisbursements();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status pencairan');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sale_id: '',
      bank_name: '',
      amount: 0,
      disbursement_date: '',
      stage: 1,
      status: 'pending'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-white/40 text-text-primary';
    }
  };

  const filteredDisbursements = disbursements.filter(item => 
    item.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sale?.customer?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Pencairan KPR</h1>
            <p className="text-text-secondary">Tracking Pencairan Dana KPR dari Bank</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Input Pencairan
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nama konsumen atau bank..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Tanggal Cair</TH>
                <TH className="px-6 py-3 font-semibold">Konsumen</TH>
                <TH className="px-6 py-3 font-semibold">Unit</TH>
                <TH className="px-6 py-3 font-semibold">Bank</TH>
                <TH className="px-6 py-3 font-semibold text-right">Nilai Cair</TH>
                <TH className="px-6 py-3 font-semibold">Tahap</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={8} className="px-6 py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div></TD></TR>
              ) : filteredDisbursements.length === 0 ? (
                <TR><TD colSpan={8} className="px-6 py-10 text-center text-text-secondary">Tidak ada data pencairan KPR.</TD></TR>
              ) : (
                filteredDisbursements.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.disbursement_date)}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-text-primary">{item.sale?.customer?.full_name}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{item.sale?.unit?.unit_number}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary font-bold">{item.bank_name}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">Tahap {item.stage}</TD>
                    <TD className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', getStatusColor(item.status))}>{item.status}</span>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={() => handleStatusUpdate(item.id, 'received')}><CheckCircle className="w-4 h-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Input Pencairan KPR">
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Transaksi Penjualan</label>
            <select className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" value={formData.sale_id} onChange={(e) => setFormData({ ...formData, sale_id: e.target.value })} required>
              <option value="">-- Pilih Penjualan --</option>
              {sales.map(s => (
                <option key={s.id} value={s.id}>{s.customer?.full_name} ({s.unit?.unit_number})</option>
              ))}
            </select>
          </div>
          <Input label="Nama Bank" placeholder="Contoh: Bank Mandiri, BTN, dll" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} required />
          <Input label="Nilai Pencairan (Rp)" type="number" placeholder="Rp 0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Pencairan" type="date" value={formData.disbursement_date} onChange={(e) => setFormData({ ...formData, disbursement_date: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Tahap Ke-</label>
              <select className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: Number(e.target.value) })} required>
                <option value="1">Tahap 1 (40%)</option>
                <option value="2">Tahap 2 (50%)</option>
                <option value="3">Tahap 3 (10%)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Pencairan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KPRDisbursementPage;
