import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, CheckCircle2, XCircle, Clock, FileText, Download, ArrowLeft } from 'lucide-react';
import { Payment } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { PaymentForm } from '../components/forms/PaymentForm';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    fetchPayments();
    fetchSales();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Fetch payments with joined data
      const data = await api.get('payments', 'select=*,sale:sales(customer:customers(full_name),unit:units(unit_number))&order=payment_date.desc');
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const data = await api.get('sales', 'select=id,customer:customers(full_name),unit:units(unit_number)&status=eq.active');
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
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

  const handleVerify = async (paymentId: string, installmentId?: string) => {
    if (!confirm('Verifikasi pembayaran ini?')) return;
    try {
      setLoading(true);
      await api.update('payments', paymentId, { status: 'verified' });
      if (installmentId) {
        await api.update('installments', installmentId, { status: 'paid', paid_at: new Date().toISOString() });
      }
      await fetchPayments();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      alert(`Gagal verifikasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.sale?.customer?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sale?.unit?.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Pembayaran</h1>
            <p className="text-text-secondary">Verifikasi dan kelola pembayaran pelanggan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
          <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Input Pembayaran</Button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Input Pembayaran Baru" size="lg">
        <PaymentForm sales={sales} onSuccess={() => { setIsModalOpen(false); fetchPayments(); }} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              placeholder="Cari pelanggan atau unit..." 
              className="w-full h-10 rounded-xl border border-white/40 pl-10 pr-4 text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Pelanggan & Unit</TH>
                <TH className="px-6 py-3 font-semibold">Jumlah</TH>
                <TH className="px-6 py-3 font-semibold">Tanggal</TH>
                <TH className="px-6 py-3 font-semibold">Metode</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-muted">Memuat data...</TD></TR>
              ) : filteredPayments.length === 0 ? (
                <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">Tidak ada pembayaran ditemukan.</TD></TR>
              ) : (
                filteredPayments.map((payment) => (
                  <TR key={payment.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4">
                      <div className="font-medium text-text-primary">{payment.sale?.customer?.full_name}</div>
                      <div className="text-xs text-text-secondary">Unit: {payment.sale?.unit?.unit_number}</div>
                    </TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary">{formatCurrency(payment.amount)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(payment.payment_date)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary capitalize">{payment.payment_method}</TD>
                    <TD className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {payment.status === 'verified' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        <span className={cn('text-xs font-medium capitalize', payment.status === 'verified' ? 'text-emerald-700' : 'text-amber-700')}>
                          {payment.status === 'verified' ? 'Terverifikasi' : 'Menunggu'}
                        </span>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => generateReceipt(payment)}><FileText className="w-4 h-4" /></Button>
                        {payment.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleVerify(payment.id, payment.installment_id)}>Verifikasi</Button>
                        )}
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

export default Payments;
