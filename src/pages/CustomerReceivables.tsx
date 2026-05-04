import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Filter, ChevronDown, ChevronRight,
  DollarSign, AlertTriangle, Landmark, Clock, Download, FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReceivableRow {
  saleId: string;
  customerName: string;
  unitNumber: string;
  projectName: string;
  paymentMethod: string;
  saleDate: string;
  finalPrice: number;
  bookingFee: number;
  dpAmount: number;
  depositAmount: number;
  totalPaid: number;
  totalKprReceived: number;
  sisaPiutang: number;
  hasOverdue: boolean;
  oldestUnpaidDate: string | null;
  payments: any[];
  installments: any[];
  kprDisbursements: any[];
}

type FilterType = 'all' | 'kpr' | 'installment' | 'overdue' | 'lunas';

const CustomerReceivables: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesRaw, paymentsData, installmentsData, kprData, customersData, unitsData, projectsData] = await Promise.all([
        api.get('sales', 'select=*&status=neq.cancelled&order=sale_date.desc'),
        api.get('payments', 'select=*&status=eq.verified'),
        api.get('installments', 'select=*&order=due_date.asc'),
        api.get('kpr_disbursement', 'select=*'),
        api.get('customers', 'select=id,full_name'),
        api.get('units', 'select=id,unit_number,project_id'),
        api.get('projects', 'select=id,name'),
      ]);

      const customerMap: Record<string, any> = {};
      (customersData || []).forEach((c: any) => { customerMap[c.id] = c; });
      const projectMap: Record<string, any> = {};
      (projectsData || []).forEach((p: any) => { projectMap[p.id] = p; });
      const unitMap: Record<string, any> = {};
      (unitsData || []).forEach((u: any) => {
        unitMap[u.id] = { ...u, project: u.project_id ? (projectMap[u.project_id] || null) : null };
      });
      const sales = (salesRaw || []).map((s: any) => ({
        ...s,
        customer: s.customer_id ? (customerMap[s.customer_id] || null) : null,
        unit: s.unit_id ? (unitMap[s.unit_id] || null) : null,
      }));
      const payments = paymentsData || [];
      const installments = installmentsData || [];
      const kprs = kprData || [];
      const today = new Date().toISOString().split('T')[0];

      const rows: ReceivableRow[] = sales
        .filter((s: any) => s.payment_method === 'kpr' || s.payment_method === 'installment')
        .map((sale: any) => {
          const salePayments = payments.filter((p: any) => p.sale_id === sale.id);
          const saleInstallments = installments.filter((i: any) => i.sale_id === sale.id);
          const saleKprs = kprs.filter((k: any) => k.sale_id === sale.id);

          const totalPaid = salePayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const totalKprReceived = saleKprs
            .filter((k: any) => k.status === 'received')
            .reduce((sum: number, k: any) => sum + (Number(k.amount) || 0), 0);

          const sisaPiutang = Math.max(0,
            (Number(sale.final_price) || 0)
            - totalPaid
            - totalKprReceived
            - (Number(sale.deposit_amount) || 0)
          );

          const overdueInstallments = saleInstallments.filter(
            (i: any) => i.status === 'unpaid' && i.due_date < today
          );
          const oldestUnpaid = saleInstallments.find((i: any) => i.status === 'unpaid');

          return {
            saleId: sale.id,
            customerName: sale.customer?.full_name || 'N/A',
            unitNumber: sale.unit?.unit_number || '-',
            projectName: sale.unit?.project?.name || '-',
            paymentMethod: sale.payment_method,
            saleDate: sale.sale_date,
            finalPrice: Number(sale.final_price) || 0,
            bookingFee: Number(sale.booking_fee) || 0,
            dpAmount: Number(sale.dp_amount) || 0,
            depositAmount: Number(sale.deposit_amount) || 0,
            totalPaid,
            totalKprReceived,
            sisaPiutang,
            hasOverdue: overdueInstallments.length > 0,
            oldestUnpaidDate: oldestUnpaid?.due_date || null,
            payments: salePayments,
            installments: saleInstallments,
            kprDisbursements: saleKprs,
          };
        });

      setReceivables(rows);
    } catch (error) {
      console.error('Error fetching receivables:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (saleId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let rows = receivables;
    if (filter === 'kpr') rows = rows.filter(r => r.paymentMethod === 'kpr');
    else if (filter === 'installment') rows = rows.filter(r => r.paymentMethod === 'installment');
    else if (filter === 'overdue') rows = rows.filter(r => r.hasOverdue);
    else if (filter === 'lunas') rows = rows.filter(r => r.sisaPiutang <= 0);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.customerName.toLowerCase().includes(q) ||
        r.unitNumber.toLowerCase().includes(q) ||
        r.projectName.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [receivables, filter, searchTerm]);

  // Aging report
  const aging = useMemo(() => {
    const today = new Date();
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
    receivables.forEach(r => {
      if (r.sisaPiutang <= 0) return;
      if (!r.oldestUnpaidDate) { buckets.current += r.sisaPiutang; return; }
      const diff = Math.floor((today.getTime() - new Date(r.oldestUnpaidDate).getTime()) / 86400000);
      if (diff <= 0) buckets.current += r.sisaPiutang;
      else if (diff <= 30) buckets.d30 += r.sisaPiutang;
      else if (diff <= 60) buckets.d60 += r.sisaPiutang;
      else if (diff <= 90) buckets.d90 += r.sisaPiutang;
      else buckets.over90 += r.sisaPiutang;
    });
    return buckets;
  }, [receivables]);

  const totalOutstanding = receivables.reduce((s, r) => s + r.sisaPiutang, 0);
  const totalOverdue = receivables.filter(r => r.hasOverdue).reduce((s, r) => s + r.sisaPiutang, 0);
  const totalKpr = receivables.filter(r => r.paymentMethod === 'kpr').reduce((s, r) => s + r.sisaPiutang, 0);
  const totalInstallment = receivables.filter(r => r.paymentMethod === 'installment').reduce((s, r) => s + r.sisaPiutang, 0);

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Laporan Piutang Konsumen', 14, 18);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 24);
    (doc as any).autoTable({
      startY: 30,
      head: [['Konsumen', 'Unit', 'Proyek', 'Metode', 'Harga Final', 'Sudah Bayar', 'Sisa Piutang', 'Status']],
      body: filtered.map(r => [
        r.customerName, r.unitNumber, r.projectName,
        r.paymentMethod === 'kpr' ? 'KPR' : 'Bertahap',
        formatCurrency(r.finalPrice), formatCurrency(r.totalPaid + r.totalKprReceived + r.depositAmount),
        formatCurrency(r.sisaPiutang),
        r.sisaPiutang <= 0 ? 'Lunas' : r.hasOverdue ? 'Overdue' : 'Berjalan'
      ]),
      styles: { fontSize: 8 },
    });
    doc.save('Laporan_Piutang_Konsumen.pdf');
  };

  const getStatus = (r: ReceivableRow) => {
    if (r.sisaPiutang <= 0) return { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700' };
    if (r.hasOverdue) return { label: 'Overdue', cls: 'bg-red-50 text-red-700' };
    return { label: 'Berjalan', cls: 'bg-amber-50 text-amber-700' };
  };

  const progressPct = (r: ReceivableRow) => {
    const total = r.finalPrice;
    if (total <= 0) return 100;
    const paid = r.totalPaid + r.totalKprReceived + r.depositAmount;
    return Math.min(100, Math.round((paid / total) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Piutang Konsumen</h1>
            <p className="text-text-secondary">Monitoring posisi piutang seluruh konsumen</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportPdf}>
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Outstanding', value: totalOutstanding, icon: DollarSign, color: 'text-accent-dark', bg: 'bg-accent-lavender/20' },
          { label: 'Total Overdue', value: totalOverdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Piutang KPR', value: totalKpr, icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Piutang Bertahap', value: totalInstallment, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(c => (
          <Card key={c.label} className="p-5 border-none shadow-premium bg-white">
            <div className="flex items-center gap-3">
              <div className={cn('p-3 rounded-xl', c.bg)}><c.icon className={cn('w-5 h-5', c.color)} /></div>
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{c.label}</p>
                <p className={cn('text-xl font-black', c.color)}>{formatCurrency(c.value)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Aging Report */}
      <Card className="p-6 border-none shadow-premium bg-white">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-dark" /> Aging Report — Umur Piutang
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Belum Jatuh Tempo', value: aging.current, cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
            { label: '1 – 30 Hari', value: aging.d30, cls: 'border-amber-200 bg-amber-50 text-amber-700' },
            { label: '31 – 60 Hari', value: aging.d60, cls: 'border-orange-200 bg-orange-50 text-orange-700' },
            { label: '61 – 90 Hari', value: aging.d90, cls: 'border-red-200 bg-red-50 text-red-700' },
            { label: '> 90 Hari', value: aging.over90, cls: 'border-red-400 bg-red-100 text-red-800' },
          ].map(b => (
            <div key={b.label} className={cn('p-4 rounded-xl border-2 text-center', b.cls)}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1">{b.label}</p>
              <p className="text-lg font-black">{formatCurrency(b.value)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari konsumen, unit, atau proyek..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {([
              ['all', 'Semua'], ['kpr', 'KPR'], ['installment', 'Bertahap'], ['overdue', 'Overdue'], ['lunas', 'Lunas']
            ] as [FilterType, string][]).map(([key, label]) => (
              <Button key={key} variant={filter === key ? 'default' : 'ghost'} size="sm"
                onClick={() => setFilter(key)}
                className={cn('rounded-lg text-xs font-bold', filter === key && 'shadow-glass')}
              >{label}</Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider">
                <TH className="px-4 py-3 w-8"></TH>
                <TH className="px-4 py-3 font-semibold">Konsumen</TH>
                <TH className="px-4 py-3 font-semibold">Unit</TH>
                <TH className="px-4 py-3 font-semibold">Metode</TH>
                <TH className="px-4 py-3 font-semibold text-right">Harga Final</TH>
                <TH className="px-4 py-3 font-semibold text-right">Sudah Bayar</TH>
                <TH className="px-4 py-3 font-semibold text-right">Sisa Piutang</TH>
                <TH className="px-4 py-3 font-semibold">Progress</TH>
                <TH className="px-4 py-3 font-semibold text-center">Status</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={9} className="px-4 py-10 text-center text-text-muted">Memuat data piutang...</TD></TR>
              ) : filtered.length === 0 ? (
                <TR><TD colSpan={9} className="px-4 py-10 text-center text-text-secondary">Tidak ada data piutang.</TD></TR>
              ) : (
                filtered.map(r => {
                  const status = getStatus(r);
                  const pct = progressPct(r);
                  const isExpanded = expandedRows.has(r.saleId);
                  return (
                    <React.Fragment key={r.saleId}>
                      <TR className="hover:bg-white/30 transition-colors cursor-pointer" onClick={() => toggleRow(r.saleId)}>
                        <TD className="px-4 py-4">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                        </TD>
                        <TD className="px-4 py-4">
                          <div className="font-bold text-text-primary text-sm">{r.customerName}</div>
                          <div className="text-[10px] text-text-muted">{r.projectName}</div>
                        </TD>
                        <TD className="px-4 py-4 text-sm font-medium text-text-primary">{r.unitNumber}</TD>
                        <TD className="px-4 py-4">
                          <span className={cn('inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase',
                            r.paymentMethod === 'kpr' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                          )}>{r.paymentMethod === 'kpr' ? 'KPR' : 'Bertahap'}</span>
                        </TD>
                        <TD className="px-4 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(r.finalPrice)}</TD>
                        <TD className="px-4 py-4 text-sm font-bold text-emerald-600 text-right">{formatCurrency(r.totalPaid + r.totalKprReceived + r.depositAmount)}</TD>
                        <TD className="px-4 py-4 text-sm font-black text-accent-dark text-right">{formatCurrency(r.sisaPiutang)}</TD>
                        <TD className="px-4 py-4 w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white/40 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-accent-dark' : 'bg-amber-500')}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-text-muted w-8 text-right">{pct}%</span>
                          </div>
                        </TD>
                        <TD className="px-4 py-4 text-center">
                          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black', status.cls)}>{status.label}</span>
                        </TD>
                      </TR>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <TR className="bg-white/20">
                          <TD colSpan={9} className="px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left: Ringkasan */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Ringkasan Finansial</h4>
                                <div className="bg-white/60 p-4 rounded-xl border border-white/60 space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-text-secondary">Harga Final</span><span className="font-bold">{formatCurrency(r.finalPrice)}</span></div>
                                  {r.depositAmount > 0 && <div className="flex justify-between text-blue-600"><span>Titipan Terpakai</span><span>-{formatCurrency(r.depositAmount)}</span></div>}
                                  {r.totalPaid > 0 && <div className="flex justify-between text-emerald-600"><span>Total Pembayaran Diverifikasi</span><span>-{formatCurrency(r.totalPaid)}</span></div>}
                                  {r.totalKprReceived > 0 && <div className="flex justify-between text-blue-600"><span>Pencairan KPR Diterima</span><span>-{formatCurrency(r.totalKprReceived)}</span></div>}
                                  <div className="flex justify-between border-t border-white/60 pt-2 font-black text-accent-dark">
                                    <span>Total Sisa Piutang</span><span>{formatCurrency(r.sisaPiutang)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Timeline */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">
                                  {r.paymentMethod === 'kpr' ? 'Tahapan KPR' : 'Jadwal Cicilan'}
                                </h4>
                                <div className="bg-white/60 p-4 rounded-xl border border-white/60 max-h-[250px] overflow-y-auto space-y-2">
                                  {r.paymentMethod === 'kpr' ? (
                                    r.kprDisbursements.length === 0 ? (
                                      <p className="text-xs text-text-muted italic">Belum ada data pencairan KPR.</p>
                                    ) : r.kprDisbursements.map((k: any, i: number) => (
                                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/40 last:border-0">
                                        <div>
                                          <span className="font-bold text-text-primary">Tahap {k.stage}</span>
                                          <span className="text-text-muted text-xs ml-2">{k.bank_name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold">{formatCurrency(Number(k.amount))}</span>
                                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full',
                                            k.status === 'received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                          )}>{k.status === 'received' ? 'Diterima' : 'Pending'}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    r.installments.length === 0 ? (
                                      <p className="text-xs text-text-muted italic">Belum ada jadwal cicilan.</p>
                                    ) : r.installments.map((inst: any, i: number) => {
                                      const isOverdue = inst.status === 'unpaid' && inst.due_date < new Date().toISOString().split('T')[0];
                                      return (
                                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/40 last:border-0">
                                          <div>
                                            <span className="font-bold text-text-primary">Cicilan {i + 1}</span>
                                            <span className="text-text-muted text-xs ml-2">{formatDate(inst.due_date)}</span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="font-bold">{formatCurrency(Number(inst.amount))}</span>
                                            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full',
                                              inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                              isOverdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                            )}>{inst.status === 'paid' ? 'Lunas' : isOverdue ? 'Overdue' : 'Belum Bayar'}</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                          </TD>
                        </TR>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default CustomerReceivables;
