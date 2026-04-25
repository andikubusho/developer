import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { api } from '../lib/api';

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
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCashFlow();
  }, []);

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      const data = await api.get('cash_flow', 'select=*&order=created_at.desc');
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cash Flow</h1>
            <p className="text-text-secondary">Arus Kas Masuk dan Keluar Real-time</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="w-4 h-4 mr-2" /> Pilih Periode</Button>
          <Button>Export Laporan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-green-50 border-green-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-600 mb-1">Total Kas Masuk</p>
          <h3 className="text-2xl font-bold text-green-900">{formatCurrency(totalIn)}</h3>
        </Card>

        <Card className="p-6 bg-red-50 border-red-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm font-medium text-red-600 mb-1">Total Kas Keluar</p>
          <h3 className="text-2xl font-bold text-red-900">{formatCurrency(totalOut)}</h3>
        </Card>

        <Card className="p-6 bg-accent-lavender/20 border-accent-lavender/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="w-10 h-10 bg-accent-lavender/30 rounded-xl flex items-center justify-center text-accent-dark">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-medium text-accent-dark mb-1">Net Cash Flow</p>
          <h3 className="text-2xl font-bold text-accent-dark">{formatCurrency(netFlow)}</h3>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari deskripsi atau kategori..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
                <TH className="px-6 py-3 font-semibold">Kategori</TH>
                <TH className="px-6 py-3 font-semibold">Deskripsi</TH>
                <TH className="px-6 py-3 font-semibold text-right">Masuk (In)</TH>
                <TH className="px-6 py-3 font-semibold text-right">Keluar (Out)</TH>
                <TH className="px-6 py-3 font-semibold text-right">Saldo</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : filteredFlow.length === 0 ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">Tidak ada data arus kas.</TD></TR>
              ) : (
                filteredFlow.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.date)}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-text-primary">{item.category}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">{item.description}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-green-600 text-right">{item.type === 'in' ? formatCurrency(item.amount) : '-'}</TD>
                    <TD className="px-6 py-4 text-sm font-bold text-red-600 text-right">{item.type === 'out' ? formatCurrency(item.amount) : '-'}</TD>
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

export default CashFlowPage;
