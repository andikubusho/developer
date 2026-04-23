import React, { useState } from 'react';
import { BarChart3, ArrowLeft, Download, FileText, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';

const FinancialReportsPage: React.FC = () => {
  const { division, setDivision } = useAuth();
  const [selectedReport, setSelectedReport] = useState<'pnl' | 'balance' | 'cashflow'>('pnl');

  const reports = [
    { id: 'pnl', name: 'Laporan Laba Rugi', icon: TrendingUp, description: 'Ringkasan pendapatan dan beban operasional.' },
    { id: 'balance', name: 'Neraca (Balance Sheet)', icon: PieChart, description: 'Posisi aset, kewajiban, dan ekuitas perusahaan.' },
    { id: 'cashflow', name: 'Arus Kas (Indirect)', icon: FileText, description: 'Perubahan kas dari aktivitas operasi, investasi, dan pendanaan.' },
  ];

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
            <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan</h1>
            <p className="text-slate-500">Analisis Performa Keuangan Perusahaan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Pilih Periode
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Download Semua
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card 
            key={report.id} 
            className={cn(
              "p-6 cursor-pointer transition-all hover:shadow-md border-2",
              selectedReport === report.id ? "border-indigo-600 bg-indigo-50/30" : "border-transparent"
            )}
            onClick={() => setSelectedReport(report.id as any)}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
              selectedReport === report.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            )}>
              <report.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{report.name}</h3>
            <p className="text-sm text-slate-500">{report.description}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-bold text-slate-900">
            {reports.find(r => r.id === selectedReport)?.name}
          </h2>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>

        {/* Mock Report Content */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex justify-between text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              <span>Keterangan</span>
              <span>Jumlah (IDR)</span>
            </div>
            
            {selectedReport === 'pnl' && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pendapatan Penjualan Unit</span>
                  <span className="font-bold text-slate-900">{formatCurrency(1500000000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pendapatan Lain-lain</span>
                  <span className="font-bold text-slate-900">{formatCurrency(25000000)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100">
                  <span className="text-slate-900 uppercase">Total Pendapatan</span>
                  <span className="text-indigo-600">{formatCurrency(1525000000)}</span>
                </div>
                <div className="h-4"></div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Beban Pokok Penjualan (HPP)</span>
                  <span className="font-bold text-red-600">({formatCurrency(850000000)})</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100">
                  <span className="text-slate-900 uppercase">Laba Kotor</span>
                  <span className="text-indigo-600">{formatCurrency(675000000)}</span>
                </div>
              </div>
            )}

            {selectedReport === 'balance' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Aset Lancar</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Kas dan Setara Kas</span>
                  <span className="font-bold text-slate-900">{formatCurrency(2500000000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Piutang Usaha</span>
                  <span className="font-bold text-slate-900">{formatCurrency(750000000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Persediaan Proyek</span>
                  <span className="font-bold text-slate-900">{formatCurrency(5400000000)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100">
                  <span className="text-slate-900 uppercase">Total Aset</span>
                  <span className="text-indigo-600">{formatCurrency(8650000000)}</span>
                </div>
              </div>
            )}

            {selectedReport === 'cashflow' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Aktivitas Operasi</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Penerimaan dari Pelanggan</span>
                  <span className="font-bold text-slate-900">{formatCurrency(1200000000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pembayaran ke Supplier</span>
                  <span className="font-bold text-red-600">({formatCurrency(450000000)})</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100">
                  <span className="text-slate-900 uppercase">Kas Bersih dari Operasi</span>
                  <span className="text-indigo-600">{formatCurrency(750000000)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FinancialReportsPage;

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

