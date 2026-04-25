import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Wallet, ArrowLeft, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

interface PettyCashItem {
  id: string;
  date: string;
  description: string;
  type: 'in' | 'out';
  amount: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
}

const PettyCashPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode, division, setDivision } = useAuth();
  const [pettyCash, setPettyCash] = useState<PettyCashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    requested_by: '',
    description: '',
    amount: 0,
    type: 'out' as const
  });

  useEffect(() => {
    fetchPettyCash();
  }, []);

  const fetchPettyCash = async () => {
    try {
      setLoading(true);
      const data = await api.get('petty_cash', 'select=*&order=date.desc');
      setPettyCash(data || []);
    } catch (err) {
      console.error('Fetch Petty Cash Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.insert('petty_cash', formData);
      await fetchPettyCash();
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        requested_by: '',
        description: '',
        amount: 0,
        type: 'out'
      });
    } catch (error: any) {
      console.error('Error saving petty cash:', error);
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data kas kecil ini?')) return;
    try {
      setLoading(true);
      await api.delete('petty_cash', id);
      await fetchPettyCash();
    } catch (error: any) {
      console.error('Error deleting petty cash:', error);
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = pettyCash
    .filter(i => i.status === 'approved')
    .reduce((sum, i) => i.type === 'in' ? sum + i.amount : sum - i.amount, 0);

  const filteredPetty = pettyCash.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.requested_by.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-text-primary">Petty Cash</h1>
            <p className="text-text-secondary">Manajemen Kas Kecil Operasional</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Laporan
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Input Pengeluaran
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-accent-dark text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Saldo Kas Kecil Saat Ini</p>
            <h3 className="text-3xl font-bold">{formatCurrency(currentBalance)}</h3>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari deskripsi atau pemohon..." 
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
                <TH className="px-6 py-3 font-semibold">Pemohon</TH>
                <TH className="px-6 py-3 font-semibold">Deskripsi</TH>
                <TH className="px-6 py-3 font-semibold text-right">Jumlah</TH>
                <TH className="px-6 py-3 font-semibold">Tipe</TH>
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
              ) : filteredPetty.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                    Tidak ada data kas kecil.
                  </TD>
                </TR>
              ) : (
                filteredPetty.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-text-primary">{item.requested_by}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{item.description}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </TD>
                    <TD className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        item.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
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
        title="Input Pengeluaran Kas Kecil"
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Tipe</label>
              <select 
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="out">Keluar</option>
                <option value="in">Masuk</option>
              </select>
            </div>
          </div>
          <Input label="Pemohon" placeholder="Nama pemohon" value={formData.requested_by} onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })} required />
          <Input label="Deskripsi" placeholder="Contoh: Pembelian ATK" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          <Input label="Jumlah (Rp)" type="number" placeholder="Rp 0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={loading}>Simpan Data</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PettyCashPage;



