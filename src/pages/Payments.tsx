import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle2, Clock, FileText, Download, ArrowLeft, RotateCcw } from 'lucide-react';
import { Payment } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { api } from '../lib/api';

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const [payData, salesData, customersData, unitsData] = await Promise.all([
        api.get('payments', 'select=*&order=payment_date.desc'),
        api.get('sales', 'select=id,customer_id,unit_id'),
        api.get('customers', 'select=id,full_name'),
        api.get('units', 'select=id,unit_number'),
      ]);
      const customerMap: Record<string, any> = {};
      (customersData || []).forEach((c: any) => { customerMap[c.id] = c; });
      const unitMap: Record<string, any> = {};
      (unitsData || []).forEach((u: any) => { unitMap[u.id] = u; });
      const saleMap: Record<string, any> = {};
      (salesData || []).forEach((s: any) => {
        saleMap[s.id] = { ...s, customer: customerMap[s.customer_id] || null, unit: unitMap[s.unit_id] || null };
      });
      const enriched = (payData || []).map((p: any) => ({
        ...p,
        sale: p.sale_id ? (saleMap[p.sale_id] || null) : null,
      }));

      // Deduplicate: same sale + amount + date → keep verified first, else latest created_at
      const deduped = Object.values(
        enriched.reduce((acc: Record<string, any>, p: any) => {
          const key = `${p.sale_id}|${p.amount}|${p.payment_date}`;
          if (!acc[key]) {
            acc[key] = p;
          } else {
            const cur = acc[key];
            if (p.status === 'verified' && cur.status !== 'verified') {
              acc[key] = p;
            } else if (p.status === cur.status && (p.created_at || '') > (cur.created_at || '')) {
              acc[key] = p;
            }
          }
          return acc;
        }, {})
      );

      setPayments(deduped as Payment[]);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const generateReceipt = (payment: Payment) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('KWITANSI PEMBAYARAN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('ERP ALM - Solusi Properti Modern', 105, 28, { align: 'center' });
    doc.line(20, 35, 190, 35);
    doc.setFontSize(12);
    doc.text(`No. Transaksi: ${payment.id.substring(0, 8).toUpperCase()}`, 20, 50);
    doc.text(`Tanggal: ${formatDate(payment.payment_date)}`, 20, 60);
    doc.text('Telah terima dari:', 20, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(payment.sale?.customer?.full_name || '-', 60, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('Untuk pembayaran:', 20, 90);
    doc.text(`Unit ${payment.sale?.unit?.unit_number || '-'}`, 60, 90);
    doc.text('Sejumlah:', 20, 110);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(payment.amount), 60, 110);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Metode Pembayaran:', 20, 120);
    doc.text(payment.payment_method, 60, 120);
    doc.text('Hormat Kami,', 150, 150);
    doc.text('( Admin Keuangan )', 150, 180);
    doc.save(`Kwitansi_${payment.id.substring(0, 8)}.pdf`);
  };

  // Unverify: kembalikan payment ke pending + hapus cash_flow terkait
  // (Verify dilakukan di halaman Verifikasi Transaksi)
  const handleUnverify = async (payment: Payment) => {
    if (!confirm('Batalkan verifikasi ini? Status kembali ke pending dan mutasi arus kas akan dihapus.')) return;
    try {
      setLoading(true);
      await api.update('payments', payment.id, { status: 'pending' });

      if (payment.installment_id) {
        await api.update('installments', payment.installment_id, { status: 'unpaid', paid_at: null });
      }

      const cfData = await api.get('cash_flow', `reference_id=eq.${payment.id}`);
      if (cfData && cfData.length > 0) {
        for (const cf of cfData) {
          await api.update('cash_flow', cf.id, { status: 'pending' });
        }
      }

      await fetchPayments();
      alert('Verifikasi berhasil dibatalkan. Transaksi kembali ke antrean verifikasi.');
    } catch (error: any) {
      alert(`Gagal membatalkan verifikasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Hapus pembayaran ini? Data arus kas terkait juga akan dihapus.')) return;
    try {
      setLoading(true);
      const cfData = await api.get('cash_flow', `reference_id=eq.${paymentId}`);
      if (cfData && cfData.length > 0) {
        for (const cf of cfData) {
          await api.delete('cash_flow', cf.id);
        }
      }
      await api.delete('payments', paymentId);
      await fetchPayments();
    } catch (error: any) {
      alert(`Gagal menghapus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p: Payment) =>
    p.sale?.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sale?.unit?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Schedule Pembayaran</h1>
            <p className="text-text-secondary">Semua pembayaran masuk — verifikasi dilakukan di menu Verifikasi Transaksi</p>
          </div>
        </div>
        <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              placeholder="Cari pelanggan atau unit..."
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                <TH className="px-3 py-3 font-semibold">Pelanggan & Unit</TH>
                <TH className="px-3 py-3 font-semibold text-right">Jumlah</TH>
                <TH className="px-3 py-3 font-semibold hidden sm:table-cell">Tanggal</TH>
                <TH className="px-3 py-3 font-semibold">Metode</TH>
                <TH className="px-3 py-3 font-semibold text-center">Status</TH>
                <TH className="px-3 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-muted">Memuat...</TD></TR>
              ) : filteredPayments.length === 0 ? (
                <TR><TD colSpan={6} className="px-3 py-10 text-center text-text-secondary">Tidak ada data.</TD></TR>
              ) : (
                filteredPayments.map((payment: Payment) => (
                  <TR key={payment.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-3 py-4">
                      <div className="font-bold text-text-primary text-[11px] truncate max-w-[120px]">
                        {payment.sale?.customer?.full_name}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        Unit: {payment.sale?.unit?.unit_number}
                      </div>
                      <div className="sm:hidden text-[9px] text-text-muted">{formatDate(payment.payment_date)}</div>
                    </TD>
                    <TD className="px-3 py-4 text-[11px] font-black text-text-primary text-right whitespace-nowrap">
                      {formatCurrency(payment.amount)}
                    </TD>
                    <TD className="px-3 py-4 text-[10px] text-text-secondary hidden sm:table-cell whitespace-nowrap">
                      {formatDate(payment.payment_date)}
                    </TD>
                    <TD className="px-3 py-4">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase',
                        payment.payment_method === 'Tunai' || payment.payment_method === 'Tunai / Cash'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      )}>
                        {payment.payment_method}
                      </span>
                    </TD>
                    <TD className="px-3 py-4 text-center">
                      {payment.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 text-amber-600">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </TD>
                    <TD className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => generateReceipt(payment)}
                          title="Cetak kwitansi"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        {payment.status === 'verified' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-amber-600"
                            onClick={() => handleUnverify(payment)}
                            title="Batalkan verifikasi"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default Payments;
