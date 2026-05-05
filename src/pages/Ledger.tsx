import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, FileSpreadsheet, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference_no: string;
  debit: number;
  credit: number;
  balance: number;
}

interface CoaOpt { code: string; name: string }

const LedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [coaOptions, setCoaOptions] = useState<CoaOpt[]>([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const data = await api.get('chart_of_accounts',
        'select=code,name&is_postable=eq.true&is_active=eq.true&order=code.asc');
      setCoaOptions(data || []);
      if (!selectedAccount && data && data[0]) setSelectedAccount(data[0].code);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        const mockLedger: LedgerEntry[] = [
          { id: '1', date: '2026-03-27', description: 'Penerimaan Booking Fee - Cici Lestari', reference_no: 'BF-001', debit: 5000000, credit: 0, balance: 105000000 },
          { id: '2', date: '2026-03-26', description: 'Pembayaran Listrik Kantor', reference_no: 'EXP-001', debit: 0, credit: 1500000, balance: 100000000 },
          { id: '3', date: '2026-03-25', description: 'Saldo Awal', reference_no: 'SA-001', debit: 101500000, credit: 0, balance: 101500000 },
        ];
        setLedgerEntries(mockLedger);
      } else {
        // Tabel ledger / journal_entries belum dibuat — tampilkan empty state.
        // Akan di-implement saat modul Jurnal Umum dibangun.
        setLedgerEntries([]);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLedger = ledgerEntries.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reference_no.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-text-primary">Buku Besar</h1>
            <p className="text-text-secondary">Rincian Transaksi per Akun / COA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button>Export Excel</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Pilih Akun</label>
            <select
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              {coaOptions.length === 0 ? (
                <option value="">Belum ada akun</option>
              ) : (
                coaOptions.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Periode</label>
            <div className="flex gap-2">
              <Input type="date" className="h-10" />
              <Input type="date" className="h-10" />
            </div>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Tampilkan Data
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0">
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
                    Tidak ada data buku besar untuk akun ini.
                  </TD>
                </TR>
              ) : (
                filteredLedger.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-accent-dark">{item.reference_no}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{item.description}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">
                      {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                    </TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">
                      {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                    </TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(item.balance)}</TD>
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



