import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, CheckCircle2, Trash2, Clock, Landmark, Wallet } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface PendingTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'in' | 'out';
  category: string;
  bank_account_id: string | null;
  status: 'pending';
  reference_id: string;
  reference_type: 'deposit' | 'payment';
  bank?: {
    bank_name: string;
    account_number: string;
  };
}

const VerificationQueue: React.FC = () => {
  const navigate = useNavigate();
  const { profile, division } = useAuth();
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    // RBAC: Only Keuangan, Audit, and Admin can access
    const isAuthorized = profile?.role === 'admin' || division === 'keuangan' || division === 'audit';
    if (!isAuthorized && !loading) {
      navigate('/', { replace: true });
      return;
    }
    fetchData();
  }, [division, profile, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cfData, bankData] = await Promise.all([
        api.get('cash_flow', 'status=eq.pending&order=date.desc'),
        api.get('bank_accounts', 'select=id,bank_name,account_number')
      ]);
      setTransactions(cfData || []);
      setBanks(bankData || []);
    } catch (error) {
      console.error('Error fetching verification queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (item: PendingTransaction) => {
    if (profile?.role !== 'admin' && division !== 'keuangan') {
      alert('Hanya Admin atau Keuangan yang dapat melakukan verifikasi.');
      return;
    }
    if (!confirm('Verifikasi transaksi ini? Data akan masuk ke laporan Arus Kas.')) return;
    try {
      setLoading(true);
      // 1. Update Cash Flow Status
      // 1. Update Source Table Status
      if (item.reference_id && item.reference_type) {
        const table = item.reference_type === 'deposit' ? 'deposits' : 'payments';
        await api.update(table, item.reference_id, { status: 'verified' });
        
        // Special case for payments: update installment if exists
        if (item.reference_type === 'payment') {
          const paymentData = await api.get('payments', `id=eq.${item.reference_id}`);
          if (paymentData?.[0]?.installment_id) {
            await api.update('installments', paymentData[0].installment_id, { 
              status: 'paid', 
              paid_at: new Date().toISOString() 
            });
          }
        }
      }

      // 2. Update Cash Flow Status
      await api.update('cash_flow', item.id, { status: 'verified' });
      
      await fetchData();
      alert('Transaksi berhasil diverifikasi.');
    } catch (error: any) {
      alert(`Gagal verifikasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (item: PendingTransaction) => {
    if (!confirm('Batalkan transaksi ini? Record akan dihapus dari antrean dan status di modul asal kembali ke pending.')) return;
    try {
      setLoading(true);
      // 1. Revert Source Status
      if (item.reference_id && item.reference_type) {
        const table = item.reference_type === 'deposit' ? 'deposits' : 'payments';
        await api.update(table, item.reference_id, { status: 'pending' });
      }
      
      // 2. Hard Delete from Cash Flow
      await api.delete('cash_flow', item.id);
      
      await fetchData();
      alert('Transaksi berhasil dibatalkan.');
    } catch (error: any) {
      alert(`Gagal membatalkan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.map(item => ({
    ...item,
    bank: item.bank_account_id ? banks.find(b => b.id === item.bank_account_id) : null
  })).filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Verifikasi Transaksi</h1>
            <p className="text-text-secondary">Antrean transaksi yang menunggu persetujuan keuangan</p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              placeholder="Cari deskripsi atau kategori..." 
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold text-center">Tipe</TH>
              <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              <TH className="px-6 py-3 font-semibold">Akun / Rekening</TH>
              <TH className="px-6 py-3 font-semibold">Kategori & Deskripsi</TH>
              <TH className="px-6 py-3 font-semibold text-right">Jumlah</TH>
              <TH className="px-6 py-3 font-semibold text-center">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat antrean...</TD></TR>
            ) : filteredTransactions.length === 0 ? (
              <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">Tidak ada transaksi yang menunggu verifikasi.</TD></TR>
            ) : (
              filteredTransactions.map((item) => (
                <TR key={item.id} className="hover:bg-white/30 transition-colors border-l-4 border-amber-400">
                  <TD className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className={cn("p-2 rounded-full", item.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                  </TD>
                  <TD className="px-6 py-4 text-sm text-text-primary font-medium">{formatDate(item.date)}</TD>
                  <TD className="px-6 py-4">
                    {item.bank ? (
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-accent-dark" />
                        <div>
                          <p className="text-[10px] font-black text-text-primary uppercase">{item.bank.bank_name}</p>
                          <p className="text-[9px] text-text-secondary">{item.bank.account_number}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase">Kas Besar</span>
                      </div>
                    )}
                  </TD>
                  <TD className="px-6 py-4">
                    <p className="text-xs font-black text-text-primary uppercase tracking-tight">{item.category}</p>
                    <p className="text-[10px] text-text-secondary truncate max-w-xs">{item.description}</p>
                  </TD>
                  <TD className="px-6 py-4 text-sm font-black text-text-primary text-right">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 px-4 text-[10px] font-black border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => handleVerify(item)}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIKASI
                      </Button>
                    </div>
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

export default VerificationQueue;
