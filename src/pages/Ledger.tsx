import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, FileSpreadsheet, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

interface JournalRow {
  id: string;
  date: string;
  description: string;
  reference_no: string | null;
  account_code: string | null;
  debit: number;
  credit: number;
  entry_group_id: string | null;
}

interface CoaOpt {
  code: string;
  name: string;
  account_type: string;
  normal_balance: 'debit' | 'credit';
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference_no: string;
  debit: number;
  credit: number;
  balance: number;     // running balance
}

const formatCode = (code: string): string => {
  if (!code || code.length !== 7) return code;
  return `${code[0]}-${code.slice(1,3)}-${code.slice(3,5)}-${code.slice(5,7)}`;
};

const LedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const [coaOptions, setCoaOptions] = useState<CoaOpt[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [journalRows, setJournalRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCoa, setLoadingCoa] = useState(true);

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => {
    if (selectedAccount) fetchJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, startDate, endDate]);

  const fetchAccounts = async () => {
    try {
      setLoadingCoa(true);
      const data = await api.get('chart_of_accounts',
        'select=code,name,account_type,normal_balance&is_postable=eq.true&is_active=eq.true&order=code.asc');
      setCoaOptions(data || []);
      if (!selectedAccount && data && data[0]) setSelectedAccount(data[0].code);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoadingCoa(false);
    }
  };

  const fetchJournal = async () => {
    try {
      setLoading(true);
      let q = `select=*&account_code=eq.${selectedAccount}&order=date.asc,created_at.asc`;
      if (startDate) q += `&date=gte.${startDate}`;
      if (endDate) q += `&date=lte.${endDate}`;
      const data = await api.get('general_journal', q);
      setJournalRows(data || []);
    } catch (err) {
      console.error('Error fetching journal:', err);
      setJournalRows([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedCoa = useMemo(
    () => coaOptions.find(c => c.code === selectedAccount),
    [coaOptions, selectedAccount]
  );

  // Hitung running balance berdasar saldo normal akun
  const ledgerEntries = useMemo<LedgerEntry[]>(() => {
    if (!selectedCoa) return [];
    let running = 0;
    return journalRows.map(r => {
      const debit = Number(r.debit) || 0;
      const credit = Number(r.credit) || 0;
      // Saldo normal debit: balance += debit - credit
      // Saldo normal credit: balance += credit - debit
      if (selectedCoa.normal_balance === 'debit') {
        running += debit - credit;
      } else {
        running += credit - debit;
      }
      return {
        id: r.id,
        date: r.date,
        description: r.description || '-',
        reference_no: r.reference_no || '-',
        debit,
        credit,
        balance: running,
      };
    });
  }, [journalRows, selectedCoa]);

  const filteredLedger = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return ledgerEntries;
    return ledgerEntries.filter(item =>
      item.description.toLowerCase().includes(s) ||
      item.reference_no.toLowerCase().includes(s)
    );
  }, [ledgerEntries, searchTerm]);

  const totals = useMemo(() => {
    const totalDebit = ledgerEntries.reduce((s, l) => s + l.debit, 0);
    const totalCredit = ledgerEntries.reduce((s, l) => s + l.credit, 0);
    const finalBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
    return { totalDebit, totalCredit, finalBalance };
  }, [ledgerEntries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-text-secondary" />
              <h1 className="text-2xl font-bold text-text-primary">Buku Besar</h1>
            </div>
            <p className="text-text-secondary">Rincian Transaksi per Akun (COA)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button>Export Excel</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Akun</label>
            <select
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              disabled={loadingCoa}
            >
              {coaOptions.length === 0 ? (
                <option value="">Belum ada akun. Jalankan migrasi chart_of_accounts.</option>
              ) : (
                coaOptions.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Dari Tanggal</label>
            <Input type="date" className="h-10" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Sampai Tanggal</label>
            <Input type="date" className="h-10" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {selectedCoa && (
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="font-mono font-bold text-text-secondary">{formatCode(selectedCoa.code)}</span>
            <span className="font-bold text-text-primary">{selectedCoa.name}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
              Saldo Normal: {selectedCoa.normal_balance === 'debit' ? 'Debit' : 'Kredit'}
            </span>
          </div>
        )}
      </Card>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Debit</p>
          <h3 className="text-xl font-bold text-emerald-900 mt-1">{formatCurrency(totals.totalDebit)}</h3>
        </Card>
        <Card className="p-4 bg-rose-50 border-rose-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Total Credit</p>
          <h3 className="text-xl font-bold text-rose-900 mt-1">{formatCurrency(totals.totalCredit)}</h3>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Saldo Akhir</p>
          <h3 className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(totals.finalBalance)}</h3>
        </Card>
      </div>

      {/* Tabel transaksi */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari deskripsi atau referensi..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table className="min-w-[800px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-6 py-3 font-semibold">Tanggal</TH>
              <TH className="px-6 py-3 font-semibold">Referensi</TH>
              <TH className="px-6 py-3 font-semibold">Deskripsi</TH>
              <TH className="px-6 py-3 font-semibold text-right">Debit</TH>
              <TH className="px-6 py-3 font-semibold text-right">Kredit</TH>
              <TH className="px-6 py-3 font-semibold text-right">Saldo</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR>
                <TD colSpan={6} className="px-6 py-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
                </TD>
              </TR>
            ) : filteredLedger.length === 0 ? (
              <TR>
                <TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                  {!selectedAccount
                    ? 'Pilih akun terlebih dahulu.'
                    : 'Tidak ada transaksi untuk akun ini di periode terpilih.'}
                </TD>
              </TR>
            ) : (
              filteredLedger.map((item) => (
                <TR key={item.id} className="hover:bg-white/30 transition-colors">
                  <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                  <TD className="px-6 py-4 text-sm font-bold text-accent-dark">{item.reference_no}</TD>
                  <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{item.description}</TD>
                  <TD className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                    {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                  </TD>
                  <TD className="px-6 py-4 text-sm font-bold text-rose-600 text-right">
                    {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                  </TD>
                  <TD className={cn(
                    "px-6 py-4 text-sm font-bold text-right",
                    item.balance >= 0 ? "text-text-primary" : "text-rose-700"
                  )}>
                    {formatCurrency(item.balance)}
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

export default LedgerPage;
