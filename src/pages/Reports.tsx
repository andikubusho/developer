import React, { useState } from 'react';
import { BarChart3, FileText, Download, Calendar, Filter, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import { useAuth } from '../contexts/AuthContext';

const Reports: React.FC = () => {
  const { division, setDivision } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('sales');

  if (division !== 'marketing') {
    return (
      <div className="space-y-6">
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
            <h1 className="text-2xl font-bold text-slate-900">Laporan & Analitik</h1>
            <p className="text-slate-500">Generate laporan operasional dan keuangan</p>
          </div>
        </div>
        <Card className="p-12 text-center text-slate-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Data laporan belum tersedia untuk divisi ini.</p>
        </Card>
      </div>
    );
  }

  const generateReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`LAPORAN ${reportType.toUpperCase()}`, 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Periode: ${dateFrom || 'Awal'} s/d ${dateTo || 'Sekarang'}`, 105, 28, { align: 'center' });
    
    const headers = [['Tanggal', 'Keterangan', 'Kategori', 'Jumlah']];
    const data = [
      ['2026-03-01', 'Booking Fee Unit A1', 'Penjualan', 'Rp 5.000.000'],
      ['2026-03-05', 'DP Unit B2', 'Penjualan', 'Rp 50.000.000'],
      ['2026-03-10', 'Cicilan 1 Unit C3', 'Piutang', 'Rp 10.000.000'],
      ['2026-03-15', 'Pelunasan Unit D4', 'Penjualan', 'Rp 450.000.000'],
    ];

    (doc as any).autoTable({
      startY: 40,
      head: headers,
      body: data,
      theme: 'striped',
      headStyles: { fillStyle: [79, 70, 229] }
    });

    doc.save(`Laporan_${reportType}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-900">Laporan & Analitik</h1>
          <p className="text-slate-500">Generate laporan operasional dan keuangan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1" title="Filter Laporan">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Jenis Laporan</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="sales">Laporan Penjualan</option>
                <option value="payments">Laporan Pemasukan</option>
                <option value="installments">Laporan Piutang</option>
                <option value="materials">Laporan Logistik</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Dari Tanggal" 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input 
                label="Sampai Tanggal" 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={generateReport}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 bg-indigo-50 rounded-full mb-4">
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Laporan Penjualan</h3>
            <p className="text-sm text-slate-500 mt-2">Rekapitulasi unit terjual, marketing performance, dan total omzet.</p>
            <Button variant="outline" className="mt-6 w-full">Lihat Preview</Button>
          </Card>

          <Card className="flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 bg-emerald-50 rounded-full mb-4">
              <BarChart3 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Laporan Keuangan</h3>
            <p className="text-sm text-slate-500 mt-2">Arus kas masuk dari booking fee, DP, dan cicilan pelanggan.</p>
            <Button variant="outline" className="mt-6 w-full">Lihat Preview</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
