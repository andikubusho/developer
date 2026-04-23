import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowLeft, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';

interface CashFlowItem {
  id: string;
  date: string;
  description: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  balance: number;
}

const CashFlowPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCashFlow();
  }, []);

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const mockFlow: CashFlowItem[] = [
          {
            id: '1',
            date: '2026-03-27',
            description: 'Pencairan KPR Bank Mandiri - Andi Wijaya',
            type: 'in',
            category: 'KPR Disbursement',
            amount: 140000000,
            balance: 140000000
          },
          {
            id: '2',
            date: '2026-03-26',
            description: 'Pembayaran Supplier - Toko Bangunan Jaya',
            type: 'out',
            category: 'Material Purchase',
            amount: 15000000,
            balance: 125000000
          },
          {
            id: '3',
            date: '2026-03-25',
            description: 'Booking Fee - Cici Lestari',
            type: 'in',
            category: 'Sales',
            amount: 5000000,
            balance: 130000000
          }
        ];
        setCashFlow(getMockData<CashFlowItem>('cash_flow', mockFlow));
        return;
      }

      const { data, error } = await supabase
        .from('cash_flow')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setCashFlow(data || []);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIn = cashFlow.filter(i => i.type === 'in').reduce((sum, i) => sum + i.amount, 0);
  const totalOut = cashFlow.filter(i => i.type === 'out').reduce((sum, i) => sum + i.amount, 0);
  const netFlow = totalIn - totalOut;

  const filteredFlow = cashFlow.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              localStorage.removeItem('user_division');
              setDivision(null);
            }}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cash Flow</h1>
            <p className="text-slate-500">Arus Kas Masuk dan Keluar Real-time</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Pilih Periode
          </Button>
          <Button>Export Laporan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-green-50 border-green-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-600 mb-1">Total Kas Masuk</p>
          <h3 className="text-2xl font-bold text-green-900">{formatCurrency(totalIn)}</h3>
        </Card>

        <Card className="p-6 bg-red-50 border-red-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm font-medium text-red-600 mb-1">Total Kas Keluar</p>
          <h3 className="text-2xl font-bold text-red-900">{formatCurrency(totalOut)}</h3>
        </Card>

        <Card className="p-6 bg-indigo-50 border-indigo-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-medium text-indigo-600 mb-1">Net Cash Flow</p>
          <h3 className="text-2xl font-bold text-indigo-900">{formatCurrency(netFlow)}</h3>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari deskripsi atau kategori..." 
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

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Deskripsi</th>
                <th className="px-6 py-3 font-semibold text-right">Masuk (In)</th>
                <th className="px-6 py-3 font-semibold text-right">Keluar (Out)</th>
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
              ) : filteredFlow.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data arus kas.
                  </td>
                </tr>
              ) : (
                filteredFlow.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                      {item.type === 'in' ? formatCurrency(item.amount) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">
                      {item.type === 'out' ? formatCurrency(item.amount) : '-'}
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

export default CashFlowPage;



