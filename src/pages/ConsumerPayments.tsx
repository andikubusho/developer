import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, ArrowLeft, 
  CreditCard, User, Home, Calendar,
  ChevronRight, Calculator, History, Clock, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PaymentForm } from '../components/forms/PaymentForm';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { Sale, Payment } from '../types';

const ConsumerPayments: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [
        salesRaw, 
        customersData, 
        unitsData, 
        projectsData, 
        installmentsData,
        paymentsRaw
      ] = await Promise.all([
        api.get('sales', 'select=*&status=neq.cancelled&order=sale_date.desc'),
        api.get('customers', 'select=id,full_name'),
        api.get('units', 'select=id,unit_number,project_id'),
        api.get('projects', 'select=id,name'),
        api.get('installments', 'select=id,sale_id,status,amount&status=eq.unpaid'),
        api.get('payments', 'select=*&order=payment_date.desc&limit=20')
      ]);

      const customerMap: Record<string, any> = {};
      (customersData || []).forEach((c: any) => { customerMap[c.id] = c; });
      
      const projectMap: Record<string, any> = {};
      (projectsData || []).forEach((p: any) => { projectMap[p.id] = p; });
      
      const unitMap: Record<string, any> = {};
      (unitsData || []).forEach((u: any) => {
        unitMap[u.id] = { ...u, project: u.project_id ? (projectMap[u.project_id] || null) : null };
      });

      const unpaidInstallmentsMap: Record<string, number> = {};
      (installmentsData || []).forEach((inst: any) => {
        unpaidInstallmentsMap[inst.sale_id] = (unpaidInstallmentsMap[inst.sale_id] || 0) + (Number(inst.amount) || 0);
      });

      const saleMap: Record<string, any> = {};
      const enrichedSales = (salesRaw || []).map((s: any) => {
        const enriched = {
          ...s,
          customer: s.customer_id ? (customerMap[s.customer_id] || null) : null,
          unit: s.unit_id ? (unitMap[s.unit_id] || null) : null,
          unpaidAmount: unpaidInstallmentsMap[s.id] || 0
        };
        saleMap[s.id] = enriched;
        return enriched;
      });

      const enrichedPayments = (paymentsRaw || []).map((p: any) => ({
        ...p,
        sale: p.sale_id ? (saleMap[p.sale_id] || null) : null
      }));

      setSales(enrichedSales);
      setRecentPayments(enrichedPayments);
    } catch (error) {
      console.error('Error fetching data for payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const filteredSales = sales.filter(s => 
    s.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.unit?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.unit?.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Pembayaran Konsumen</h1>
            <p className="text-text-secondary">Input pembayaran cicilan atau pelunasan konsumen</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sales List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden border-none shadow-premium bg-white">
            <div className="p-4 border-b border-white/40 bg-white/30 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input 
                  placeholder="Cari konsumen atau unit untuk input bayar..." 
                  className="pl-10 h-11 border-none bg-slate-50/50" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <Table>
                <THead>
                  <TR className="bg-white/30 text-[10px] uppercase tracking-wider text-text-secondary font-black">
                    <TH className="px-6 py-4">Konsumen & Unit</TH>
                    <TH className="px-6 py-4 text-right">Sisa Cicilan</TH>
                    <TH className="px-6 py-4 text-center">Metode</TH>
                    <TH className="px-6 py-4 text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading ? (
                    <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-muted">Sinkronisasi data...</TD></TR>
                  ) : filteredSales.length === 0 ? (
                    <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-secondary">Tidak ada data transaksi aktif.</TD></TR>
                  ) : filteredSales.map((sale) => (
                    <TR key={sale.id} className="hover:bg-white/30 transition-colors group">
                      <TD className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent-lavender/20 flex items-center justify-center text-accent-dark font-black text-xs">
                            {sale.customer?.full_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm leading-tight">{sale.customer?.full_name}</div>
                            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
                              {sale.unit?.unit_number} • {sale.unit?.project?.name}
                            </div>
                          </div>
                        </div>
                      </TD>
                      <TD className="px-6 py-4 text-right">
                        <div className="font-black text-text-primary text-sm">
                          {formatCurrency((sale as any).unpaidAmount || 0)}
                        </div>
                        <div className="text-[9px] text-text-muted uppercase font-black">Unpaid Installments</div>
                      </TD>
                      <TD className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter",
                          sale.payment_method === 'kpr' ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {sale.payment_method === 'kpr' ? 'KPR' : 'Bertahap'}
                        </span>
                      </TD>
                      <TD className="px-6 py-4 text-right">
                        <Button 
                          size="sm" 
                          className="rounded-xl h-9 px-4 font-black text-[10px] uppercase tracking-widest bg-accent-dark hover:bg-accent-dark/90 shadow-glass"
                          onClick={() => handleOpenPayment(sale)}
                        >
                          Input Bayar
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </Card>

          {/* Recent Payments Table */}
          <Card className="p-0 overflow-hidden border-none shadow-premium bg-white">
            <div className="p-6 border-b border-white/40 bg-slate-50/50 flex items-center gap-3">
              <History className="w-5 h-5 text-accent-dark" />
              <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">Inputan Pembayaran Terakhir</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <Table>
                <THead>
                  <TR className="bg-white/30 text-[10px] uppercase tracking-wider text-text-secondary font-black">
                    <TH className="px-6 py-4">Konsumen</TH>
                    <TH className="px-6 py-4 text-right">Jumlah</TH>
                    <TH className="px-6 py-4 text-center">Metode</TH>
                    <TH className="px-6 py-4 text-center">Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading ? (
                    <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-muted">Memuat riwayat...</TD></TR>
                  ) : recentPayments.length === 0 ? (
                    <TR><TD colSpan={4} className="px-6 py-10 text-center text-text-secondary">Belum ada inputan pembayaran.</TD></TR>
                  ) : recentPayments.map((payment) => (
                    <TR key={payment.id} className="hover:bg-white/30 transition-colors">
                      <TD className="px-6 py-4">
                        <div className="font-bold text-text-primary text-xs truncate max-w-[150px]">
                          {payment.sale?.customer?.full_name || 'N/A'}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {formatDate(payment.payment_date)}
                        </div>
                      </TD>
                      <TD className="px-6 py-4 text-right font-black text-text-primary text-xs">
                        {formatCurrency(payment.amount)}
                      </TD>
                      <TD className="px-6 py-4 text-center">
                        <span className="text-[10px] font-bold text-text-secondary uppercase">
                          {payment.payment_method}
                        </span>
                      </TD>
                      <TD className="px-6 py-4 text-center">
                        {payment.status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-emerald-50 text-emerald-600 uppercase">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-amber-50 text-amber-600 uppercase">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-white/40 text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-bold uppercase tracking-widest text-accent-dark"
                onClick={() => navigate('/payments')}
              >
                Lihat Semua di Schedule Pembayaran <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Quick Info / Stats */}
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-accent-dark to-accent-dark/80 text-white border-none shadow-premium relative overflow-hidden">
            <div className="relative z-10">
              <Calculator className="w-8 h-8 mb-4 opacity-50" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-1">Total Tagihan Berjalan</h3>
              <p className="text-3xl font-black mb-4">
                {formatCurrency(sales.reduce((sum, s) => sum + ((s as any).unpaidAmount || 0), 0))}
              </p>
              <div className="h-1 w-20 bg-white/30 rounded-full mb-4" />
              <p className="text-[10px] font-bold text-white/70 leading-relaxed uppercase tracking-tighter">
                Jumlah piutap cicilan bertahap yang belum terbayar dari seluruh transaksi aktif.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </Card>

          <Card className="p-6 bg-white shadow-premium border-none">
            <h4 className="text-xs font-black text-text-primary uppercase tracking-widest mb-4">Panduan Input</h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">Cari nama konsumen atau unit pada tabel di samping.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">Klik tombol <strong>"Input Bayar"</strong> untuk membuka form pembayaran.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">Pilih jadwal cicilan yang ingin dibayar agar nominal terisi otomatis.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">4</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">Simpan pembayaran. Transaksi akan masuk ke <strong>Antrean Verifikasi</strong> Keuangan.</p>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setSelectedSale(null); }} 
        title="Input Pembayaran Baru"
        size="2xl"
      >
        <PaymentForm 
          sales={sales.map(s => ({
            id: s.id,
            customer: { full_name: s.customer?.full_name || 'N/A' },
            unit: { unit_number: s.unit?.unit_number || '-' }
          }))}
          initialData={selectedSale ? { sale_id: selectedSale.id } : undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedSale(null);
            fetchData();
          }}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedSale(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default ConsumerPayments;
