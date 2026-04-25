import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Receipt, ArrowLeft, Edit, Trash2, Download, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

interface TaxRecord {
  id: string;
  date: string;
  type: 'PPN' | 'PPh 21' | 'PPh 23' | 'PPh Final';
  description: string;
  amount: number;
  status: 'unpaid' | 'paid';
  due_date: string;
}

const TaxationPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode, division, setDivision } = useAuth();
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'PPN' as const,
    description: '',
    amount: 0,
    due_date: '',
    status: 'unpaid' as const
  });

  useEffect(() => {
    fetchTaxRecords();
  }, []);

  const fetchTaxRecords = async () => {
    try {
      setLoading(true);
      const data = await api.get('taxation', 'select=*&order=date.desc');
      setTaxRecords(data || []);
    } catch (err) {
      console.error('Fetch Tax Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.insert('taxation', formData);
      await fetchTaxRecords();
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'PPN',
        description: '',
        amount: 0,
        due_date: '',
        status: 'unpaid'
      });
    } catch (error: any) {
      console.error('Error saving tax:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data pajak ini?')) return;
    try {
      setLoading(true);
      await api.delete('taxation', id);
      await fetchTaxRecords();
    } catch (error: any) {
      console.error('Error deleting tax:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-white/40 text-text-primary';
    }
  };

  const filteredTax = taxRecords.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Perpajakan</h1>
            <p className="text-text-secondary">Manajemen Kewajiban Pajak Perusahaan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Laporan Pajak
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Input Data Pajak
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari jenis pajak atau keterangan..." 
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

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
                <TH className="px-6 py-3 font-semibold">Jenis Pajak</TH>
                <TH className="px-6 py-3 font-semibold">Keterangan</TH>
                <TH className="px-6 py-3 font-semibold text-right">Nilai Pajak</TH>
                <TH className="px-6 py-3 font-semibold">Jatuh Tempo</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={7} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                  </TD>
                </TR>
              ) : filteredTax.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                    Tidak ada data perpajakan.
                  </TD>
                </TR>
              ) : (
                filteredTax.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-accent-dark">{item.type}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{item.description}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-4 text-sm text-red-500 font-medium">{formatDate(item.due_date)}</TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(item.status)
                      )}>
                        {item.status}
                      </span>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Input Data Pajak"
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Transaksi" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Jenis Pajak</label>
              <select 
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="PPN">PPN (11%)</option>
                <option value="PPh 21">PPh 21 (Gaji)</option>
                <option value="PPh 23">PPh 23 (Jasa)</option>
                <option value="PPh Final">PPh Final (Penjualan)</option>
              </select>
            </div>
          </div>
          <Input label="Keterangan" placeholder="Contoh: Pajak Penjualan Unit A-01" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nilai Pajak (Rp)" type="number" placeholder="Rp 0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required />
            <Input label="Jatuh Tempo" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Status</label>
            <select 
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="unpaid">Belum Bayar (Unpaid)</option>
              <option value="paid">Sudah Bayar (Paid)</option>
            </select>
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

export default TaxationPage;



