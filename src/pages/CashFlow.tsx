import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar, Wallet, Landmark, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
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
}

const CashFlowPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all'); // all, cash, [bank_id]

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
      const data = await api.get('cash_flow', 'select=*&order=date.desc,created_at.desc');
      setCashFlow(data || []);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data arus kas ini secara permanen?')) return;
    try {
      await api.delete('cash_flow', id);
      await fetchCashFlow();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  // Filter & Mapping logic
  const filteredFlow = cashFlow.map(item => ({
    ...item,
    bank: item.bank_account_id ? banks.find(b => b.id === item.bank_account_id) : null
  })).filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedAccount === 'all') return matchesSearch;
    if (selectedAccount === 'cash') return matchesSearch && !item.bank_account_id;
    return matchesSearch && item.bank_account_id === selectedAccount;
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
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="w-4 h-4 mr-2" /> Pilih Periode</Button>
          <Button>Export Laporan</Button>
        </div>
      </div>

      {/* Account Selector */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setSelectedAccount('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
            selectedAccount === 'all' ? "bg-accent-dark text-white border-accent-dark shadow-lg shadow-accent-dark/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white"
          )}
        >
          Semua Akun
        </button>
        <button 
          onClick={() => setSelectedAccount('cash')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2",
            selectedAccount === 'cash' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white"
          )}
        >
          <Wallet className="w-4 h-4" /> Kas Besar
        </button>
        {banks.map(bank => (
          <button 
            key={bank.id}
            onClick={() => setSelectedAccount(bank.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-2",
              selectedAccount === bank.id ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/50 text-text-secondary border-white/40 hover:bg-white"
            )}
          >
            <Landmark className="w-4 h-4" /> {bank.bank_name}
          </button>
        ))}
      </div>

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
                <TH className="px-6 py-3 font-semibold">Kategori & Deskripsi</TH>
                <TH className="px-6 py-3 font-semibold text-right">Masuk (In)</TH>
                <TH className="px-6 py-3 font-semibold text-right">Keluar (Out)</TH>
                <TH className="px-6 py-3 font-semibold text-center">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : filteredFlow.length === 0 ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">Tidak ada data arus kas untuk akun ini.</TD></TR>
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
                      <div className="text-sm font-medium text-text-primary">{item.category}</div>
                      <div className="text-xs text-text-secondary max-w-xs truncate">{item.description}</div>
                    </TD>
                    <TD className="px-6 py-4 text-sm font-bold text-green-600 text-right">{item.type === 'in' ? formatCurrency(item.amount) : '-'}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-red-600 text-right">{item.type === 'out' ? formatCurrency(item.amount) : '-'}</TD>
                    <TD className="px-6 py-4 text-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
    </div>
  );
};

export default CashFlowPage;
