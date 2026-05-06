import React, { useState, useEffect, useRef } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar, Wallet, Landmark, Trash2, Plus, X, ChevronDown, ArrowLeftRight, ArrowDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { executeTransfer, deleteTransferGroup, AccountRef } from '../lib/transfer';

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
  transfer_group_id?: string | null;
  transfer_target_type?: 'bank' | 'cash_besar' | 'petty_cash' | null;
  transfer_target_id?: string | null;
}

const emptyTransferForm = {
  tanggal: new Date().toISOString().split('T')[0],
  fromKey: '',     // 'cash' | 'petty' | bankId
  toKey: '',
  jumlah: '',
  biayaAdmin: '',  // hanya relevan jika fromKey = bank
  keterangan: '',
};

const DEFAULT_KATEGORI_MASUK = [
  'Penjualan Tunai',
  'Pembayaran Angsuran',
  'Uang Muka (DP)',
  'Piutang Diterima',
  'Pendapatan Bunga',
  'Pendapatan Lain-lain',
];

const DEFAULT_KATEGORI_KELUAR = [
  'Biaya Operasional',
  'Gaji & Tunjangan',
  'Pembelian Material',
  'Biaya Utilitas',
  'Biaya Pemasaran',
  'Pajak & Retribusi',
  'Cicilan / Hutang',
  'Biaya Lain-lain',
];

const LS_KEY_IN  = 'propdev_cf_categories_in';
const LS_KEY_OUT = 'propdev_cf_categories_out';

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
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Transfer Modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState(emptyTransferForm);
  const [transferring, setTransferring] = useState(false);

  // State kategori dinamis
  const [kategoriMasuk, setKategoriMasuk] = useState<string[]>([]);
  const [kategoriKeluar, setKategoriKeluar] = useState<string[]>([]);
  const [kategoriDropdownOpen, setKategoriDropdownOpen] = useState(false);
  const [inputKategoriBaru, setInputKategoriBaru] = useState('');
  const kategoriDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    loadKategori();
  }, []);

  // Close dropdown saat klik di luar (pola identik SearchableSelect.tsx)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (kategoriDropdownRef.current && !kategoriDropdownRef.current.contains(e.target as Node))
        setKategoriDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadKategori = () => {
    const parse = (key: string, defaults: string[]): string[] => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [...defaults];
        return JSON.parse(raw) as string[];
      } catch { return [...defaults]; }
    };
    setKategoriMasuk(parse(LS_KEY_IN, DEFAULT_KATEGORI_MASUK));
    setKategoriKeluar(parse(LS_KEY_OUT, DEFAULT_KATEGORI_KELUAR));
  };

  const saveKategori = (type: 'in' | 'out', list: string[]) =>
    localStorage.setItem(type === 'in' ? LS_KEY_IN : LS_KEY_OUT, JSON.stringify(list));

  const tambahKategori = (type: 'in' | 'out', nama: string) => {
    const trimmed = nama.trim();
    if (!trimmed) return;
    const current = type === 'in' ? kategoriMasuk : kategoriKeluar;
    if (current.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      alert('Kategori sudah ada!');
      return;
    }
    const updated = [...current, trimmed];
    type === 'in' ? setKategoriMasuk(updated) : setKategoriKeluar(updated);
    saveKategori(type, updated);
    setInputKategoriBaru('');
  };

  const hapusKategori = (type: 'in' | 'out', nama: string) => {
    const count = cashFlow.filter(i => i.type === type && i.category === nama).length;
    const msg = count > 0
      ? `Kategori "${nama}" dipakai di ${count} transaksi.\nHapus dari pilihan? (Data transaksi tidak berubah)`
      : `Hapus kategori "${nama}"?`;
    if (!confirm(msg)) return;
    const updated = (type === 'in' ? kategoriMasuk : kategoriKeluar).filter(k => k !== nama);
    type === 'in' ? setKategoriMasuk(updated) : setKategoriKeluar(updated);
    saveKategori(type, updated);
    if (form.kategori === nama) setForm(prev => ({ ...prev, kategori: '' }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchBanks(), fetchProjects()]);
      await fetchCashFlow();
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await api.get('bank_accounts', 'select=id,bank_name,account_number,account_holder&order=bank_name.asc');
      setBanks(data || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await api.get('projects', 'select=id,name&order=name.asc');
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCashFlow = async () => {
    try {
      const [data, payments, deposits, sales, kprDisbursements] = await Promise.all([
        api.get('cash_flow', 'status=eq.verified&order=date.desc,created_at.desc'),
        api.get('payments', 'select=id,sale_id'),
        api.get('deposits', 'select=id,name'),
        api.get('sales', 'select=id,customer:customers(full_name)'),
        api.get('kpr_disbursement', 'select=id,sale_id')
      ]);

      const salesMap: Record<string, string> = {};
      (sales || []).forEach((s: any) => { salesMap[s.id] = s.customer?.full_name || 'Tanpa Nama'; });

      const customerMap: Record<string, string> = {};
      (deposits || []).forEach((d: any) => { customerMap[d.id] = d.name || '-'; });
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
    // Skenario: row hasil transfer → hapus pasangannya juga
    if (item.reference_type === 'transfer' && item.transfer_group_id) {
      if (!confirm('Transaksi ini adalah transfer antar akun. Hapus akan menghilangkan kedua sisi (sumber & tujuan). Lanjutkan?')) return;
      try {
        setLoading(true);
        await deleteTransferGroup(item.transfer_group_id);
        await fetchCashFlow();
      } catch (err: any) {
        alert(`Gagal menghapus transfer: ${err.message}`);
      } finally {
        setLoading(false);
      }
      return;
    }

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
    setKategoriDropdownOpen(false);
    setInputKategoriBaru('');
    setModalOpen(true);
  };

  const openTransfer = () => {
    setTransferForm({ ...emptyTransferForm, tanggal: new Date().toISOString().split('T')[0] });
    setTransferOpen(true);
  };

  // Konversi key dropdown → AccountRef
  // Format: 'cash' | 'petty_keu' | 'petty_tek:<projectId>' | bankId
  const keyToAccountRef = (key: string): AccountRef | null => {
    if (!key) return null;
    if (key === 'cash')      return { kind: 'cash_besar', label: 'Kas Besar (Tunai)' };
    if (key === 'petty_keu') return { kind: 'petty_cash', division: 'keuangan', label: 'Petty Cash Keuangan' };
    if (key.startsWith('petty_tek:')) {
      const pid = key.split(':')[1];
      const proj = projects.find(p => p.id === pid);
      return { kind: 'petty_cash', division: 'teknik', projectId: pid, label: `Petty Cash Teknik - ${proj?.name || pid}` };
    }
    const bank = banks.find((b: any) => b.id === key);
    if (!bank) return null;
    return { kind: 'bank', id: bank.id, label: `${bank.bank_name} - ${bank.account_number}` };
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const from = keyToAccountRef(transferForm.fromKey);
    const to   = keyToAccountRef(transferForm.toKey);
    if (!from || !to) { alert('Pilih akun sumber dan tujuan'); return; }
    const jumlah = Number(transferForm.jumlah.replace(/\D/g, ''));
    if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0'); return; }

    const adminFee = Number((transferForm.biayaAdmin || '').replace(/\D/g, '')) || 0;

    setTransferring(true);
    try {
      await executeTransfer({
        date: transferForm.tanggal,
        amount: jumlah,
        description: transferForm.keterangan || undefined,
        from, to,
        requestedBy: 'Transfer',
        adminFee: adminFee > 0 && from.kind === 'bank' ? adminFee : undefined,
      });
      setTransferOpen(false);
      await fetchCashFlow();
    } catch (err: any) {
      alert(`Gagal transfer: ${err.message}`);
    } finally {
      setTransferring(false);
    }
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

  // Saat "Semua Akun" dipilih, transfer dikecualikan dari total karena sifatnya hanya
  // pemindahan saldo (zero-sum) — kalau dihitung akan inflate angka kotor secara misleading.
  // Saat akun spesifik dipilih, transfer tetap dihitung karena memengaruhi saldo akun tsb.
  const isTransfer = (i: CashFlowItem) => i.reference_type === 'transfer';
  const totalsBase = selectedAccount === 'all' ? filteredFlow.filter(i => !isTransfer(i)) : filteredFlow;
  const totalIn = totalsBase.filter(i => i.type === 'in').reduce((sum, i) => sum + i.amount, 0);
  const totalOut = totalsBase.filter(i => i.type === 'out').reduce((sum, i) => sum + i.amount, 0);
  const netFlow = totalIn - totalOut;

  const getAccountLabel = () => {
    if (selectedAccount === 'all') return 'Semua Akun';
    if (selectedAccount === 'cash') return 'Kas Besar (Tunai)';
    const bank = banks.find(b => b.id === selectedAccount);
    return bank ? `${bank.bank_name} - ${bank.account_number}` : 'Akun Bank';
  };

  const kategoriListAktif = modalType === 'in' ? kategoriMasuk : kategoriKeluar;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            {(() => {
              if (selectedAccount === 'all') {
                return (
                  <>
                    <h1 className="text-2xl font-bold text-text-primary">Cash Flow</h1>
                    <p className="text-text-secondary">Pelacakan Arus Kas Per Rekening & Tunai</p>
                  </>
                );
              }
              if (selectedAccount === 'cash') {
                return (
                  <>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Cash Flow</p>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                      <Wallet className="w-6 h-6 text-emerald-600" /> Kas Besar (Tunai)
                    </h1>
                    <p className="text-text-secondary text-sm">Pemasukan & Pengeluaran Tunai</p>
                  </>
                );
              }
              const bank = banks.find((b: any) => b.id === selectedAccount);
              if (!bank) {
                return (
                  <>
                    <h1 className="text-2xl font-bold text-text-primary">Cash Flow</h1>
                    <p className="text-text-secondary">Pelacakan Arus Kas Per Rekening & Tunai</p>
                  </>
                );
              }
              return (
                <>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Cash Flow • Rekening Bank</p>
                  <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <Landmark className="w-6 h-6 text-blue-600" /> {bank.bank_name}
                    <span className="text-base font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {bank.account_number}
                    </span>
                  </h1>
                  <p className="text-text-secondary text-sm">
                    a.n. <span className="font-bold text-text-primary">{bank.account_holder || '-'}</span>
                  </p>
                </>
              );
            })()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-4 py-2 h-10 rounded-xl border border-white/40 bg-white/50 text-sm font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-dark/20 hover:bg-white transition-all w-[180px] appearance-none cursor-pointer"
            />
            {selectedMonth && (
              <button onClick={() => setSelectedMonth('')} className="absolute right-3 w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-text-secondary hover:bg-rose-100 hover:text-rose-600" title="Hapus Filter">✕</button>
            )}
          </div>
          <Button onClick={() => openModal('in')} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-none border-0">
            <Plus className="w-4 h-4" /> Pemasukan
          </Button>
          <Button onClick={() => openModal('out')} className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-none border-0">
            <Plus className="w-4 h-4" /> Pengeluaran
          </Button>
          <Button onClick={openTransfer} className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 shadow-none border-0">
            <ArrowLeftRight className="w-4 h-4" /> Transfer
          </Button>
          <Button>Export Laporan</Button>
        </div>
      </div>

      {/* Account Selector */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setSelectedAccount('all')} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border", selectedAccount === 'all' ? "bg-accent-dark text-white border-accent-dark shadow-lg shadow-accent-dark/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white")}>Semua Akun</button>
        <button onClick={() => setSelectedAccount('cash')} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2", selectedAccount === 'cash' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white")}>
          <Wallet className="w-4 h-4" /> Kas Besar
        </button>
        {banks.map(bank => (
          <button key={bank.id} onClick={() => setSelectedAccount(bank.id)} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2", selectedAccount === bank.id ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white")}>
            <Landmark className="w-4 h-4" /> {bank.bank_name}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-green-50 border-green-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600"><ArrowUpCircle className="w-6 h-6" /></div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wider">Masuk ({getAccountLabel()})</p>
          <h3 className="text-2xl font-bold text-green-900">{formatCurrency(totalIn)}</h3>
        </Card>
        <Card className="p-6 bg-red-50 border-red-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><ArrowDownCircle className="w-6 h-6" /></div>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xs font-medium text-red-600 mb-1 uppercase tracking-wider">Keluar ({getAccountLabel()})</p>
          <h3 className="text-2xl font-bold text-red-900">{formatCurrency(totalOut)}</h3>
        </Card>
        <Card className="p-6 bg-blue-50 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><TrendingUp className="w-6 h-6" /></div>
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
            <input placeholder="Cari deskripsi atau kategori..." className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none bg-white/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100"><Landmark className="w-3 h-3" /> {item.bank?.bank_name || 'Bank'}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-100"><Wallet className="w-3 h-3" /> Kas Besar</span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{item.bank?.account_number || 'Tunai'}</div>
                  </TD>
                  <TD className="px-6 py-4">
                    <div className="text-sm font-bold text-text-primary">
                      {item.reference_type === 'transfer'
                        ? <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">Transfer</span>
                        : item.reference_type === 'manual'
                          ? <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Manual</span>
                          : ((item as any).customerName || '-')}
                    </div>
                  </TD>
                  <td className="px-6 py-4">
                    {item.reference_type === 'transfer' ? (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-violet-700">
                        <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer Antar Akun
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-text-primary">{item.category}</div>
                    )}
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
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setKategoriDropdownOpen(false); setInputKategoriBaru(''); }} title={modalType === 'in' ? 'Tambah Pemasukan Manual' : 'Tambah Pengeluaran Manual'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Badge tipe */}
          <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest", modalType === 'in' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200")}>
            {modalType === 'in' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
            {modalType === 'in' ? 'Pemasukan' : 'Pengeluaran'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tanggal</label>
              <input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} required className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-accent-dark" />
            </div>

            {/* Akun */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Akun / Rekening</label>
              <select value={form.bank_account_id} onChange={e => setForm({ ...form, bank_account_id: e.target.value })} className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-accent-dark bg-white">
                <option value="">Kas Besar (Tunai)</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
              </select>
            </div>
          </div>

          {/* Kategori — Custom Dropdown */}
          <div className="flex flex-col gap-1.5" ref={kategoriDropdownRef}>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Kategori</label>

            {/* Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setKategoriDropdownOpen(p => !p)}
                className={cn(
                  "w-full h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 bg-white flex items-center justify-between transition-all focus:outline-none",
                  kategoriDropdownOpen && "border-accent-dark ring-2 ring-accent-dark/10",
                  !form.kategori && "text-slate-400"
                )}
              >
                <span className="truncate">{form.kategori || '-- Pilih Kategori --'}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200", kategoriDropdownOpen && "rotate-180")} />
              </button>

              {/* Panel Dropdown — hanya daftar pilihan */}
              {kategoriDropdownOpen && (
                <div className="absolute z-50 top-full left-0 w-full bg-white rounded-xl border-2 border-slate-100 shadow-xl mt-1 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih atau hapus kategori</p>
                  </div>
                  <div className="max-h-44 overflow-y-auto py-1">
                    {kategoriListAktif.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400 text-center">Belum ada kategori.</p>
                    ) : (
                      kategoriListAktif.map(k => (
                        <div
                          key={k}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 mx-1 rounded-lg transition-colors",
                            form.kategori === k ? "bg-accent-dark/10 text-accent-dark" : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <button
                            type="button"
                            className="flex-1 text-left text-sm font-bold truncate"
                            onClick={() => { setForm(p => ({ ...p, kategori: k })); setKategoriDropdownOpen(false); }}
                          >
                            {k}
                          </button>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); hapusKategori(modalType, k); }}
                            className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-colors flex-shrink-0"
                            title={`Hapus kategori "${k}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tambah Kategori Baru — selalu tampil di bawah dropdown */}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={inputKategoriBaru}
                onChange={e => setInputKategoriBaru(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); tambahKategori(modalType, inputKategoriBaru); }
                }}
                placeholder="+ Ketik nama kategori baru, lalu Enter..."
                className="flex-1 h-9 rounded-xl border-2 border-dashed border-slate-200 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:border-accent-dark bg-white/60 placeholder:text-slate-300 placeholder:font-medium"
              />
              <button
                type="button"
                onClick={() => tambahKategori(modalType, inputKategoriBaru)}
                className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-accent-dark hover:text-white text-slate-600 text-xs font-black flex items-center gap-1 transition-all flex-shrink-0 border-2 border-dashed border-slate-200 hover:border-accent-dark"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>
          </div>

          {/* Keterangan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Keterangan / Deskripsi</label>
            <textarea value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} rows={2} placeholder="Keterangan tambahan (opsional)..." className="rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-accent-dark resize-none" />
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
              className={cn("h-11 rounded-xl border-2 px-4 text-sm font-black focus:outline-none", modalType === 'in' ? "border-slate-100 focus:border-emerald-500 text-emerald-700" : "border-slate-100 focus:border-rose-500 text-rose-700")}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1 h-11 rounded-xl" onClick={() => { setModalOpen(false); setKategoriDropdownOpen(false); setInputKategoriBaru(''); }}>Batal</Button>
            <Button type="submit" isLoading={submitting} className={cn("flex-1 h-11 rounded-xl font-black text-white border-0", modalType === 'in' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}>
              Simpan {modalType === 'in' ? 'Pemasukan' : 'Pengeluaran'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Transfer Antar Akun */}
      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Antar Akun" size="lg">
        <form onSubmit={handleTransfer} className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-violet-50 text-violet-700 border border-violet-200">
            <ArrowLeftRight className="w-4 h-4" /> Pemindahan Saldo
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tanggal</label>
            <input type="date" value={transferForm.tanggal} onChange={e => setTransferForm({ ...transferForm, tanggal: e.target.value })} required className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dari Akun (Sumber)</label>
            <select
              value={transferForm.fromKey}
              onChange={e => setTransferForm({ ...transferForm, fromKey: e.target.value })}
              required
              className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-white"
            >
              <option value="">-- Pilih Sumber --</option>
              <optgroup label="Tunai">
                <option value="cash" disabled={transferForm.toKey === 'cash'}>Kas Besar (Tunai)</option>
              </optgroup>
              <optgroup label="Bank">
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id} disabled={transferForm.toKey === b.id}>
                    {b.bank_name} - {b.account_number}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Petty Cash">
                <option value="petty_keu" disabled={transferForm.toKey === 'petty_keu'}>Petty Cash Keuangan</option>
                {projects.map(p => {
                  const k = `petty_tek:${p.id}`;
                  return (
                    <option key={k} value={k} disabled={transferForm.toKey === k}>
                      Petty Cash Teknik - {p.name}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-violet-600" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ke Akun (Tujuan)</label>
            <select
              value={transferForm.toKey}
              onChange={e => setTransferForm({ ...transferForm, toKey: e.target.value })}
              required
              className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-white"
            >
              <option value="">-- Pilih Tujuan --</option>
              <optgroup label="Tunai">
                <option value="cash" disabled={transferForm.fromKey === 'cash'}>Kas Besar (Tunai)</option>
              </optgroup>
              <optgroup label="Bank">
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id} disabled={transferForm.fromKey === b.id}>
                    {b.bank_name} - {b.account_number}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Petty Cash">
                <option value="petty_keu" disabled={transferForm.fromKey === 'petty_keu'}>Petty Cash Keuangan</option>
                {projects.map(p => {
                  const k = `petty_tek:${p.id}`;
                  return (
                    <option key={k} value={k} disabled={transferForm.fromKey === k}>
                      Petty Cash Teknik - {p.name}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

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

          {/* Biaya Admin Bank — hanya tampil jika sumber adalah bank */}
          {!!banks.find((b: any) => b.id === transferForm.fromKey) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Biaya Admin Bank (Opsional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={transferForm.biayaAdmin}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const formatted = raw ? Number(raw).toLocaleString('id-ID') : '';
                  setTransferForm({ ...transferForm, biayaAdmin: formatted });
                }}
                placeholder="0"
                className="h-11 rounded-xl border-2 border-slate-100 px-4 text-sm font-bold text-rose-600 focus:outline-none focus:border-violet-500"
              />
              <span className="text-[11px] font-bold text-slate-400">
                Akan dicatat sebagai pengeluaran terpisah di rekening sumber (kategori "Biaya Admin Bank").
              </span>
            </div>
          )}

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
            <Button type="button" variant="ghost" className="flex-1 h-11 rounded-xl" onClick={() => setTransferOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={transferring} className="flex-1 h-11 rounded-xl font-black text-white border-0 bg-violet-600 hover:bg-violet-700">
              Eksekusi Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashFlowPage;
