import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar, Wallet, Landmark, Trash2, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

interface CashFlowItem {
  id: string;
  date: string;
  description: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  bank_account_id?: string | null;
  bank?: {
    bank_name: string;
    account_number: string;
  };
  reference_id?: string | null;
  reference_type?: string | null;
}

const KATEGORI_MASUK = [
  'Penjualan Tunai',
  'Pembayaran Angsuran',
  'Uang Muka (DP)',
  'Piutang Diterima',
  'Pendapatan Bunga',
  'Pendapatan Lain-lain',
];

const KATEGORI_KELUAR = [
  'Biaya Operasional',
  'Gaji & Tunjangan',
  'Pembelian Material',
  'Biaya Utilitas',
  'Biaya Pemasaran',
  'Pajak & Retribusi',
  'Cicilan / Hutang',
  'Biaya Lain-lain',
];

const emptyForm = {
  tanggal: new Date().toISOString().split('T')[0],
  kategori: '',
  deskripsi: '',
  jumlah: '',
  bank_account_id: '',
};

const CashFlowPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await fetchBanks();
      await fetchCashFlow();
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await api.get('bank_accounts', 'select=id,bank_name,account_number&order=bank_name.asc');
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchCashFlow = async () => {
    try {
      const [data, payments, deposits, sales, kprDisbursements] = await Promise.all([
        api.get('cash_flow', 'status=eq.verified&order=date.desc,created_at.desc'),
        api.get('payments', 'select=id,sale_id'),
        api.get('deposits', 'select=id,customer_name'),
        api.get('sales', 'select=id,customer:customers(full_name)'),
        api.get('kpr_disbursement', 'select=id,sale_id')
      ]);

      const salesMap: Record<string, string> = {};
      (sales || []).forEach((s: any) => {
        salesMap[s.id] = s.customer?.full_name || 'Tanpa Nama';
      });

      const customerMap: Record<string, string> = {};
      (deposits || []).forEach((d: any) => { customerMap[d.id] = d.customer_name; });
      (payments || []).forEach((p: any) => { customerMap[p.id] = salesMap[p.sale_id] || '-'; });
      (kprDisbursements || []).forEach((k: any) => { customerMap[k.id] = salesMap[k.sale_id] || '-'; });

      const enrichedData = (data || []).map((item: any) => ({
        ...item,
        customerName: item.reference_id ? (customerMap[item.reference_id] || '-') : '-'
      }));

      setCashFlow(enrichedData);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    }
  };

  const handleDelete = async (item: CashFlowItem) => {
    if (!confirm('Hapus data arus kas ini? Status pembayaran terkait akan kembali ke antrean verifikasi.')) return;
    try {
      setLoading(true);
      if (item.reference_id && item.reference_type && item.reference_type !== 'manual') {
        const table = item.reference_type === 'deposit' ? 'deposits' : 'payments';
        await api.update(table, item.reference_id, { status: 'pending' });
        if (item.reference_type === 'payment') {
          const payments = await api.get('payments', `id=eq.${item.reference_id}`);
          if (payments && payments[0] && payments[0].installment_id) {
            await api.update('installments', payments[0].installment_id, { status: 'unpaid', paid_at: null });
          }
        }
      }
      await api.delete('cash_flow', item.id);
      await fetchCashFlow();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'in' | 'out') => {
    setModalType(type);
    setForm({ ...emptyForm, tanggal: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kategori) { alert('Pilih kategori terlebih dahulu'); return; }
    const jumlah = Number(form.jumlah.replace(/\D/g, ''));
    if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0'); return; }

    setSubmitting(true);
    try {
      await api.insert('cash_flow', {
        date: form.tanggal,
        type: modalType,
        category: form.kategori,
        description: form.deskripsi || form.kategori,
        amount: jumlah,
        bank_account_id: form.bank_account_id || null,
        status: 'verified',
        reference_type: 'manual',
      });
      setModalOpen(false);
      await fetchCashFlow();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFlow = cashFlow.map(item => ({
    ...item,
    bank: item.bank_account_id ? banks.find(b => b.id === item.bank_account_id) : null
  })).filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = selectedMonth ? item.date.startsWith(selectedMonth) : true;
    if (!matchesSearch || !matchesMonth) return false;
    if (selectedAccount === 'all') return true;
    if (selectedAccount === 'cash') return !item.bank_account_id;
    return item.bank_account_id === selectedAccount;
  });

  const totalIn = filteredFlow.filter(i => i.type === 'in').reduce((sum, i) => sum + i.amount, 0);
  const totalOut = filteredFlow.filter(i => i.type === 'out').reduce((sum, i) => sum + i.amount, 0);
  const netFlow = totalIn - totalOut;

  const getAccountLabel = () => {
    if (selectedAccount === 'all') return 'Semua Akun';
    if (selectedAccount === 'cash') return 'Kas Besar (Tunai)';
    const bank = banks.find(b => b.id === selectedAccount);
    return bank ? `${bank.bank_name} - ${bank.account_number}` : 'Akun Bank';
  };

  const kategoriList = modalType === 'in' ? KATEGORI_MASUK : KATEGORI_KELUAR;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cash Flow</h1>
            <p className="text-text-secondary">Pelacakan Arus Kas Per Rekening & Tunai</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Filter bulan */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-4 py-2 h-10 rounded-xl border border-white/40 bg-white/50 text-sm font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-dark/20 hover:bg-white transition-all w-[180px] appearance-none cursor-pointer"
            />
            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth('')}
                className="absolute right-3 w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-text-secondary hover:bg-rose-100 hover:text-rose-600"
                title="Hapus Filter"
              >✕</button>
            )}
          </div>
          {/* Tombol manual entry */}
          <Button
            onClick={() => openModal('in')}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-none border-0"
          >
            <Plus className="w-4 h-4" /> Pemasukan
          </Button>
          <Button
            onClick={() => openModal('out')}
            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-none border-0"
          >
            <Plus className="w-4 h-4" /> Pengeluaran
          </Button>
          <Button>Export Laporan</Button>
        </div>
      </div>

      {/* Account Selector */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedAccount('all')}
          className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border", selectedAccount === 'all' ? "bg-accent-dark text-white border-accent-dark shadow-lg shadow-accent-dark/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white")}
        >Semua Akun</button>
        <button
          onClick={() => setSelectedAccount('cash')}
          className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2", selectedAccount === 'cash' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white")}
        >
          <Wallet className="w-4 h-4" /> Kas Besar
        </button>
        {banks.map(bank => (
          <button
            key={bank.id}
            onClick={() => setSelectedAccount(bank.id)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2", selectedAccount === bank.id ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white")}
          >
            <Landmark className="w-4 h-4" /> {bank.bank_name}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-green-50 border-green-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wider">Masuk ({getAccountLabel()})</p>
          <h3 className="text-2xl font-bold text-green-900">{formatCurrency(totalIn)}</h3>
        </Card>
        <Card className="p-6 bg-red-50 border-red-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xs font-medium text-red-600 mb-1 uppercase tracking-wider">Keluar ({getAccountLabel()})</p>
          <h3 className="text-2xl font-bold text-red-900">{formatCurrency(totalOut)}</h3>
        </Card>
        <Card className="p-6 bg-blue-50 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wider">Saldo Akhir ({getAccountLabel()})</p>
          <h3 className="text-2xl font-bold text-blue-900">{formatCurrency(netFlow)}</h3>
        </Card>
      </div>

      {/* Tabel */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4 bg-white/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              placeholder="Cari deskripsi atau kategori..."
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none bg-white/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter Lanjutan</Button>
        </div>

        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              <TH className="px-6 py-3 font-semibold">Akun / Rekening</TH>
              <TH className="px-6 py-3 font-semibold">Nama Konsumen</TH>
              <TH className="px-6 py-3 font-semibold">Kategori & Deskripsi</TH>
              <TH className="px-6 py-3 font-semibold text-right">Masuk (In)</TH>
              <TH className="px-6 py-3 font-semibold text-right">Keluar (Out)</TH>
              <TH className="px-6 py-3 font-semibold text-center">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
            ) : filteredFlow.length === 0 ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">Tidak ada data arus kas untuk akun ini.</TD></TR>
            ) : (
              filteredFlow.map((item) => (
                <TR key={item.id} className="hover:bg-white/30 transition-colors">
                  <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                  <TD className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {item.bank_account_id ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                          <Landmark className="w-3 h-3" /> {item.bank?.bank_name || 'Bank'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-100">
                          <Wallet className="w-3 h-3" /> Kas Besar
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{item.bank?.account_number || 'Tunai'}</div>
                  </TD>
                  <TD className="px-6 py-4">
                    <div className="text-sm font-bold text-text-primary">
                      {item.reference_type === 'manual' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Manual</span>
                      ) : (item.customerName || '-')}
                    </div>
                  </TD>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-text-primary">{item.category}</div>
                    <div className="text-xs text-text-secondary">{item.description}</div>
                  </td>
                  <TD className="px-6 py-4 text-sm font-bold text-green-600 text-right">{item.type === 'in' ? formatCurrency(item.amount) : '-'}</TD>
                  <TD className="px-6 py-4 text-sm font-bold text-red-600 text-right">{item.type === 'out' ? formatCurrency(item.amount) : '-'}</TD>
                  <TD className="px-6 py-4 text-center">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {/* Modal Tambah Manual */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'in' ? 'Tambah Pemasukan Manual' : 'Tambah Pengeluaran Manual'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Badge tipe */}
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest",
            modalType === 'in' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
          )}>
            {modalType === 'in' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
            {modalType === 'in' ? 'Pemasukan' : 'Pengeluaran'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm({ ...form, tanggal: e.target.value })}
                required
                className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-accent-dark"
              />
            </div>

            {/* Akun */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Akun / Rekening</label>
              <select
                value={form.bank_account_id}
                onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
                className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-accent-dark bg-white"
              >
                <option value="">Kas Besar (Tunai)</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kategori */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Kategori</label>
            <select
              value={form.kategori}
              onChange={e => setForm({ ...form, kategori: e.target.value })}
              required
              className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-accent-dark bg-white"
            >
              <option value="">-- Pilih Kategori --</option>
              {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Keterangan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Keterangan / Deskripsi</label>
            <textarea
              value={form.deskripsi}
              onChange={e => setForm({ ...form, deskripsi: e.target.value })}
              rows={2}
              placeholder="Keterangan tambahan (opsional)..."
              className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-accent-dark resize-none"
            />
          </div>

          {/* Jumlah */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.jumlah}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                const formatted = raw ? Number(raw).toLocaleString('id-ID') : '';
                setForm({ ...form, jumlah: formatted });
              }}
              placeholder="0"
              required
              className={cn(
                "h-11 rounded-xl border-2 px-4 text-sm font-black focus:outline-none",
                modalType === 'in' ? "border-slate-100 focus:border-emerald-500 text-emerald-700" : "border-slate-100 focus:border-rose-500 text-rose-700"
              )}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1 h-11 rounded-xl" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              className={cn(
                "flex-1 h-11 rounded-xl font-black text-white border-0",
                modalType === 'in' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              Simpan {modalType === 'in' ? 'Pemasukan' : 'Pengeluaran'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashFlowPage;
