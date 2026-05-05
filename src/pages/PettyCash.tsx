import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Wallet, ArrowLeft, Edit, Trash2, Download, ArrowLeftRight, ArrowDown, Landmark } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { executeTransfer, deleteTransferGroup, AccountRef } from '../lib/transfer';

interface PettyCashItem {
  id: string;
  date: string;
  description: string;
  type: 'in' | 'out';
  amount: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  transfer_group_id?: string | null;
  source_type?: 'manual' | 'bank' | 'cash_besar' | null;
  source_id?: string | null;
}

const PettyCashPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode, division, setDivision } = useAuth();
  const [pettyCash, setPettyCash] = useState<PettyCashItem[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Top-up Transfer Modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferForm, setTransferForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    direction: 'in' as 'in' | 'out',  // 'in' = top-up dari bank/kas, 'out' = setor balik
    counterKey: '',                     // 'cash' | bankId
    jumlah: '',
    keterangan: '',
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    requested_by: '',
    description: '',
    amount: 0,
    type: 'out' as const
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPettyCash(), fetchBanks()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPettyCash = async () => {
    try {
      const data = await api.get('petty_cash', 'select=*&order=date.desc');
      setPettyCash(data || []);
    } catch (err) {
      console.error('Fetch Petty Cash Failed:', err);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await api.get('bank_accounts', 'select=id,bank_name,account_number&order=bank_name.asc');
      setBanks(data || []);
    } catch (err) {
      console.error('Fetch Banks Failed:', err);
    }
  };

  const counterToAccountRef = (key: string): AccountRef | null => {
    if (!key) return null;
    if (key === 'cash') return { kind: 'cash_besar', label: 'Kas Besar (Tunai)' };
    const bank = banks.find((b: any) => b.id === key);
    if (!bank) return null;
    return { kind: 'bank', id: bank.id, label: `${bank.bank_name} - ${bank.account_number}` };
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const counter = counterToAccountRef(transferForm.counterKey);
    if (!counter) { alert('Pilih akun bank atau Kas Besar'); return; }
    const jumlah = Number(transferForm.jumlah.replace(/\D/g, ''));
    if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0'); return; }

    setTransferring(true);
    try {
      await executeTransfer({
        date: transferForm.tanggal,
        amount: jumlah,
        description: transferForm.keterangan || undefined,
        from: transferForm.direction === 'in' ? counter : { kind: 'petty_cash', label: 'Petty Cash' },
        to:   transferForm.direction === 'in' ? { kind: 'petty_cash', label: 'Petty Cash' } : counter,
        requestedBy: 'Transfer',
      });
      setTransferOpen(false);
      setTransferForm({
        tanggal: new Date().toISOString().split('T')[0],
        direction: 'in',
        counterKey: '',
        jumlah: '',
        keterangan: '',
      });
      await fetchPettyCash();
    } catch (err: any) {
      alert(`Gagal transfer: ${err.message}`);
    } finally {
      setTransferring(false);
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

  const handleDelete = async (item: PettyCashItem) => {
    // Row hasil transfer → hapus pasangannya juga (di cash_flow)
    if (item.transfer_group_id) {
      if (!confirm('Transaksi ini adalah transfer antar akun. Hapus akan menghilangkan kedua sisi (Petty Cash & Cash Flow). Lanjutkan?')) return;
      try {
        setLoading(true);
        await deleteTransferGroup(item.transfer_group_id);
        await fetchPettyCash();
      } catch (err: any) {
        alert(`Gagal menghapus transfer: ${err.message}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!confirm('Hapus data kas kecil ini?')) return;
    try {
      setLoading(true);
      await api.delete('petty_cash', item.id);
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Laporan
          </Button>
          <Button
            onClick={() => { setTransferForm(p => ({ ...p, direction: 'in' })); setTransferOpen(true); }}
            className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 shadow-none border-0"
          >
            <ArrowLeftRight className="w-4 h-4" /> Top Up / Setor
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
                filteredPetty.map((item) => {
                  const isTransfer = !!item.transfer_group_id;
                  const sourceBank = item.source_id ? banks.find((b: any) => b.id === item.source_id) : null;
                  const sourceLabel = isTransfer
                    ? (item.source_type === 'cash_besar' ? 'Kas Besar' : sourceBank ? `${sourceBank.bank_name} ${sourceBank.account_number}` : 'Bank')
                    : '';
                  return (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-text-primary">
                      {isTransfer
                        ? <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">Transfer</span>
                        : item.requested_by}
                    </TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">
                      {isTransfer && (
                        <div className="flex items-center gap-1.5 text-violet-700 font-bold text-xs mb-0.5">
                          <ArrowLeftRight className="w-3 h-3" />
                          {item.type === 'in' ? `Top-up dari ${sourceLabel}` : `Setor ke ${sourceLabel}`}
                        </div>
                      )}
                      <div>{item.description}</div>
                    </TD>
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
                        {!isTransfer && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                  );
                })
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

      {/* Modal Transfer (Top-up dari / Setor ke Bank/Kas Besar) */}
      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Petty Cash" size="lg">
        <form onSubmit={handleTransferSubmit} className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-50 text-violet-700 border border-violet-200">
            <ArrowLeftRight className="w-4 h-4" /> Pemindahan Saldo
          </div>

          {/* Toggle arah */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTransferForm(p => ({ ...p, direction: 'in' }))}
              className={cn(
                "h-10 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                transferForm.direction === 'in'
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-500 hover:bg-white"
              )}
            >
              Top Up (Masuk ke Petty)
            </button>
            <button
              type="button"
              onClick={() => setTransferForm(p => ({ ...p, direction: 'out' }))}
              className={cn(
                "h-10 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                transferForm.direction === 'out'
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-500 hover:bg-white"
              )}
            >
              Setor (Keluar dari Petty)
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tanggal</label>
            <input type="date" value={transferForm.tanggal} onChange={e => setTransferForm({ ...transferForm, tanggal: e.target.value })} required className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500" />
          </div>

          {transferForm.direction === 'in' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dari (Sumber Dana)</label>
                <select
                  value={transferForm.counterKey}
                  onChange={e => setTransferForm({ ...transferForm, counterKey: e.target.value })}
                  required
                  className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-white"
                >
                  <option value="">-- Pilih Sumber --</option>
                  <option value="cash">Kas Besar (Tunai)</option>
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-black text-emerald-700">Petty Cash</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100">
                <Wallet className="w-5 h-5 text-rose-600" />
                <span className="text-sm font-black text-rose-700">Petty Cash</span>
              </div>
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ke (Tujuan)</label>
                <select
                  value={transferForm.counterKey}
                  onChange={e => setTransferForm({ ...transferForm, counterKey: e.target.value })}
                  required
                  className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-white"
                >
                  <option value="">-- Pilih Tujuan --</option>
                  <option value="cash">Kas Besar (Tunai)</option>
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={transferForm.jumlah}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                const formatted = raw ? Number(raw).toLocaleString('id-ID') : '';
                setTransferForm({ ...transferForm, jumlah: formatted });
              }}
              placeholder="0"
              required
              className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-black text-violet-700 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Keterangan (Opsional)</label>
            <textarea
              value={transferForm.keterangan}
              onChange={e => setTransferForm({ ...transferForm, keterangan: e.target.value })}
              rows={2}
              placeholder="Mis. Top-up kas kecil bulan Mei..."
              className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setTransferOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={transferring} className="flex-1 h-11 rounded-xl font-black text-white border-0 bg-violet-600 hover:bg-violet-700">
              Eksekusi Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PettyCashPage;



