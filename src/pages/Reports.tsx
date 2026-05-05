import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, Download, Calendar, ArrowLeft, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { division } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState<'sales' | 'payments' | 'receivables' | 'commission'>('sales');
  const [generating, setGenerating] = useState(false);
  const [previewCount, setPreviewCount] = useState<{ sales: number; payments: number } | null>(null);

  useEffect(() => {
    fetchPreviewCount();
  }, []);

  const fetchPreviewCount = async () => {
    try {
      const [s, p] = await Promise.all([
        api.get('sales', 'select=id&status=neq.cancelled'),
        api.get('payments', 'select=id&status=eq.verified'),
      ]);
      setPreviewCount({ sales: (s || []).length, payments: (p || []).length });
    } catch {
      setPreviewCount({ sales: 0, payments: 0 });
    }
  };

  if (division !== 'marketing' && division !== 'audit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Laporan & Analitik</h1>
            <p className="text-text-secondary">Generate laporan operasional dan keuangan</p>
          </div>
        </div>
        <Card className="p-12 text-center text-text-secondary">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Menu ini hanya untuk divisi Marketing & Audit.</p>
        </Card>
      </div>
    );
  }

  // ============= Helpers untuk fetch & build data =============
  const buildContext = async () => {
    const [salesRaw, customers, units, projects, paymentsRaw, installments, kprs] = await Promise.all([
      api.get('sales', 'select=*&status=neq.cancelled&order=sale_date.desc'),
      api.get('customers', 'select=id,full_name,phone'),
      api.get('units', 'select=id,unit_number,project_id'),
      api.get('projects', 'select=id,name'),
      api.get('payments', 'select=*&status=eq.verified&order=date.desc'),
      api.get('installments', 'select=*'),
      api.get('kpr_disbursement', 'select=*'),
    ]);

    const customerMap: Record<string, any> = {};
    (customers || []).forEach((c: any) => { customerMap[c.id] = c; });
    const projectMap: Record<string, any> = {};
    (projects || []).forEach((p: any) => { projectMap[p.id] = p; });
    const unitMap: Record<string, any> = {};
    (units || []).forEach((u: any) => {
      unitMap[u.id] = { ...u, project: u.project_id ? (projectMap[u.project_id] || null) : null };
    });

    const sales = (salesRaw || []).map((s: any) => ({
      ...s,
      customer: s.customer_id ? (customerMap[s.customer_id] || null) : null,
      unit: s.unit_id ? (unitMap[s.unit_id] || null) : null,
    }));

    return { sales, payments: paymentsRaw || [], installments: installments || [], kprs: kprs || [] };
  };

  const filterByDate = <T extends { [k: string]: any }>(rows: T[], dateField: string): T[] => {
    return rows.filter(r => {
      const d = r[dateField];
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  };

  // ============= Generate PDF per tipe =============
  const generateSalesReport = async () => {
    const { sales } = await buildContext();
    const filtered = filterByDate(sales, 'sale_date');

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('LAPORAN PENJUALAN', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Periode: ${dateFrom || 'Awal'} s/d ${dateTo || 'Sekarang'}`, 105, 25, { align: 'center' });
    doc.text(`Tanggal cetak: ${new Date().toLocaleString('id-ID')}`, 105, 30, { align: 'center' });

    const headers = [['Tgl', 'Konsumen', 'Unit', 'Proyek', 'Metode', 'Harga']];
    const rows = filtered.map(s => [
      s.sale_date ? formatDate(s.sale_date) : '-',
      s.customer?.full_name || '-',
      s.unit?.unit_number || '-',
      s.unit?.project?.name || '-',
      (s.payment_method || '').toUpperCase(),
      formatCurrency(Number(s.final_price) || 0),
    ]);

    const total = filtered.reduce((sum, s) => sum + (Number(s.final_price) || 0), 0);

    (doc as any).autoTable({
      startY: 38,
      head: headers,
      body: rows,
      foot: [['', '', '', '', 'TOTAL', formatCurrency(total)]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [240, 240, 250], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Penjualan_${Date.now()}.pdf`);
  };

  const generatePaymentsReport = async () => {
    const { sales, payments } = await buildContext();
    const filtered = filterByDate(payments, 'date');
    const saleMap: Record<string, any> = {};
    sales.forEach((s: any) => { saleMap[s.id] = s; });

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('LAPORAN PEMBAYARAN', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Periode: ${dateFrom || 'Awal'} s/d ${dateTo || 'Sekarang'}`, 105, 25, { align: 'center' });

    const headers = [['Tgl', 'Konsumen', 'Unit', 'Tipe', 'Jumlah']];
    const rows = filtered.map((p: any) => {
      const sale = p.sale_id ? saleMap[p.sale_id] : null;
      return [
        p.date ? formatDate(p.date) : '-',
        sale?.customer?.full_name || '-',
        sale?.unit?.unit_number || '-',
        p.payment_type || p.type || '-',
        formatCurrency(Number(p.amount) || 0),
      ];
    });
    const total = filtered.reduce((sum, p: any) => sum + (Number(p.amount) || 0), 0);

    (doc as any).autoTable({
      startY: 32,
      head: headers,
      body: rows,
      foot: [['', '', '', 'TOTAL', formatCurrency(total)]],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      footStyles: { fillColor: [240, 250, 245], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Pembayaran_${Date.now()}.pdf`);
  };

  const generateReceivablesReport = async () => {
    const { sales, payments, installments, kprs } = await buildContext();

    const paymentSum: Record<string, number> = {};
    payments.forEach((p: any) => {
      if (!p.sale_id) return;
      paymentSum[p.sale_id] = (paymentSum[p.sale_id] || 0) + (Number(p.amount) || 0);
    });
    const kprSum: Record<string, number> = {};
    kprs.forEach((k: any) => {
      if (!k.sale_id || k.status !== 'received') return;
      kprSum[k.sale_id] = (kprSum[k.sale_id] || 0) + (Number(k.amount) || 0);
    });

    const rows: any[] = [];
    let totalPiutang = 0;
    sales.forEach((s: any) => {
      const totalPaid = (Number(s.booking_fee) || 0) + (Number(s.dp_amount) || 0) + (paymentSum[s.id] || 0) + (kprSum[s.id] || 0);
      const sisa = (Number(s.final_price) || 0) - totalPaid;
      if (sisa <= 0) return;
      rows.push([
        s.customer?.full_name || '-',
        s.unit?.unit_number || '-',
        s.unit?.project?.name || '-',
        formatCurrency(Number(s.final_price) || 0),
        formatCurrency(totalPaid),
        formatCurrency(sisa),
      ]);
      totalPiutang += sisa;
    });

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('LAPORAN PIUTANG KONSUMEN', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Per: ${new Date().toLocaleDateString('id-ID')}`, 105, 25, { align: 'center' });

    (doc as any).autoTable({
      startY: 32,
      head: [['Konsumen', 'Unit', 'Proyek', 'Harga Jual', 'Sudah Dibayar', 'Sisa Piutang']],
      body: rows,
      foot: [['', '', '', '', 'TOTAL PIUTANG', formatCurrency(totalPiutang)]],
      theme: 'striped',
      headStyles: { fillColor: [251, 146, 60] },
      footStyles: { fillColor: [255, 245, 230], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Piutang_${Date.now()}.pdf`);
  };

  const generateCommissionReport = async () => {
    const { sales } = await buildContext();
    const filtered = filterByDate(sales, 'sale_date');

    // Commission rate default 2.5% kalau tidak ada di sale
    const rows = filtered.map((s: any) => {
      const commission = Number(s.commission_amount) || (Number(s.final_price) || 0) * 0.025;
      return [
        s.sale_date ? formatDate(s.sale_date) : '-',
        s.customer?.full_name || '-',
        s.unit?.unit_number || '-',
        formatCurrency(Number(s.final_price) || 0),
        formatCurrency(commission),
      ];
    });
    const totalKomisi = rows.reduce((sum, r) => {
      const v = parseFloat(String(r[4]).replace(/[^\d-]/g, '')) || 0;
      return sum + v;
    }, 0);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('LAPORAN KOMISI PENJUALAN', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Periode: ${dateFrom || 'Awal'} s/d ${dateTo || 'Sekarang'}`, 105, 25, { align: 'center' });

    (doc as any).autoTable({
      startY: 32,
      head: [['Tgl', 'Konsumen', 'Unit', 'Harga Jual', 'Komisi (Est.)']],
      body: rows,
      foot: [['', '', '', 'TOTAL KOMISI', formatCurrency(totalKomisi)]],
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] },
      footStyles: { fillColor: [248, 240, 255], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Komisi_${Date.now()}.pdf`);
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      switch (reportType) {
        case 'sales':       await generateSalesReport(); break;
        case 'payments':    await generatePaymentsReport(); break;
        case 'receivables': await generateReceivablesReport(); break;
        case 'commission':  await generateCommissionReport(); break;
      }
    } catch (err: any) {
      alert(`Gagal generate laporan: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Laporan & Analitik</h1>
          <p className="text-text-secondary">Generate laporan PDF dari data real-time</p>
        </div>
      </div>

      {/* Quick stats */}
      {previewCount && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Total Penjualan Aktif</p>
            <h3 className="text-2xl font-bold text-blue-900 mt-1">{previewCount.sales}</h3>
          </Card>
          <Card className="p-4 bg-emerald-50 border-emerald-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Pembayaran Verified</p>
            <h3 className="text-2xl font-bold text-emerald-900 mt-1">{previewCount.payments}</h3>
          </Card>
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Jenis Laporan</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as any)}
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
              <option value="sales">Penjualan Unit</option>
              <option value="payments">Pembayaran (Cicilan, DP, dll)</option>
              <option value="receivables">Piutang Konsumen</option>
              <option value="commission">Komisi Penjualan</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Dari Tanggal</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Sampai Tanggal</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={fetchPreviewCount}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={generateReport} isLoading={generating}>
            <Download className="w-4 h-4 mr-2" /> Generate & Download PDF
          </Button>
        </div>

        <p className="text-[11px] text-text-muted">
          Laporan dibuat dari data real-time (sales, payments, kpr_disbursement). Filter periode hanya berlaku untuk laporan Penjualan, Pembayaran, dan Komisi. Laporan Piutang menampilkan saldo piutang per saat ini.
        </p>
      </Card>
    </div>
  );
};

export default Reports;
