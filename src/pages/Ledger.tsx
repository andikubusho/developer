import React, { useState, useEffect } from 'react';
import { Search, Filter, FileSpreadsheet, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference_no: string;
  debit: number;
  credit: number;
  balance: number;
}

const LedgerPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('101');

  useEffect(() => {
    fetchLedger();
  }, [selectedAccount]);

  const fetchLedger = async () => {
    setLoading(true);
    if (isMockMode) {
      const mockLedger: LedgerEntry[] = [
        {
          id: '1',
          date: '2026-03-27',
          description: 'Penerimaan Booking Fee - Cici Lestari',
          reference_no: 'BF-001',
          debit: 5000000,
          credit: 0,
          balance: 105000000
        },
        {
          id: '2',
          date: '2026-03-26',
          description: 'Pembayaran Listrik Kantor',
          reference_no: 'EXP-001',
          debit: 0,
          credit: 1500000,
          balance: 100000000
        },
        {
          id: '3',
          date: '2026-03-25',
          description: 'Saldo Awal',
          reference_no: 'SA-001',
          debit: 101500000,
          credit: 0,
          balance: 101500000
        }
      ];
      setLedgerEntries(mockLedger);
    }
    setLoading(false);
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
            onClick={() => {
              setDivision(null);
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Buku Besar</h1>
            <p className="text-slate-500">Rincian Transaksi per Akun / COA</p>
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
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Akun</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="101">101 - Kas / Bank</option>
              <option value="102">102 - Piutang Usaha</option>
              <option value="103">103 - Persediaan Proyek</option>
              <option value="401">401 - Pendapatan Penjualan</option>
              <option value="601">601 - Beban Operasional</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Periode</label>
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
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari deskripsi atau referensi..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Referensi</th>
                <th className="px-6 py-3 font-semibold">Deskripsi</th>
                <th className="px-6 py-3 font-semibold text-right">Debit</th>
                <th className="px-6 py-3 font-semibold text-right">Kredit</th>
                <th className="px-6 py-3 font-semibold text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data buku besar untuk akun ini.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{item.reference_no}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                      {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                      {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </Card>
    </div>
  );
};

export default LedgerPage;



