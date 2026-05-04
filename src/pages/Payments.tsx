import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Calendar, User, Home, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      // Fetch ONLY unpaid installments (the schedule)
      const [instData, salesData, customersData, unitsData, projectsData, pendingPayments] = await Promise.all([
        api.get('installments', 'select=*&status=eq.unpaid&order=due_date.asc'),
        api.get('sales', 'select=id,customer_id,unit_id'),
        api.get('customers', 'select=id,full_name'),
        api.get('units', 'select=id,unit_number,project_id'),
        api.get('projects', 'select=id,name'),
        api.get('payments', 'select=installment_id&status=eq.pending')
      ]);

      const customerMap: Record<string, any> = {};
      (customersData || []).forEach((c: any) => { customerMap[c.id] = c; });
      
      const projectMap: Record<string, any> = {};
      (projectsData || []).forEach((p: any) => { projectMap[p.id] = p; });
      
      const unitMap: Record<string, any> = {};
      (unitsData || []).forEach((u: any) => { 
        unitMap[u.id] = { ...u, project: u.project_id ? (projectMap[u.project_id] || null) : null }; 
      });

      const saleMap: Record<string, any> = {};
      (salesData || []).forEach((s: any) => {
        saleMap[s.id] = { ...s, customer: customerMap[s.customer_id] || null, unit: unitMap[s.unit_id] || null };
      });

      const pendingInstIds = new Set((pendingPayments || []).map((p: any) => p.installment_id).filter(Boolean));

      const enriched = (instData || []).map((inst: any) => ({
        ...inst,
        sale: inst.sale_id ? (saleMap[inst.sale_id] || null) : null,
        isPendingPayment: pendingInstIds.has(inst.id)
      }));

      setInstallments(enriched);
    } catch (error) {
      console.error('Error fetching installment schedule:', error);
      setInstallments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedule = installments.filter((item: any) =>
    item.sale?.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sale?.unit?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Schedule Pembayaran Konsumen</h1>
            <p className="text-text-secondary">Daftar tagihan cicilan yang belum terbayar oleh konsumen</p>
          </div>
        </div>
      </div>

      <Card className="p-0 border-none shadow-premium bg-white">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              placeholder="Cari konsumen atau unit..."
              className="w-full h-11 rounded-xl border-none bg-white pl-10 pr-4 text-sm focus:outline-none shadow-sm"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider font-black">
                <TH className="px-6 py-4">Konsumen & Unit</TH>
                <TH className="px-6 py-4">Jatuh Tempo</TH>
                <TH className="px-6 py-4 text-right">Tagihan</TH>
                <TH className="px-6 py-4 text-center">Status</TH>
                <TH className="px-6 py-4 text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
                {loading ? (
                  <TR><TD colSpan={5} className="px-6 py-10 text-center text-text-muted font-bold uppercase tracking-widest text-[10px]">Sinkronisasi data...</TD></TR>
                ) : filteredSchedule.length === 0 ? (
                  <TR><TD colSpan={5} className="px-6 py-10 text-center text-text-secondary">Tidak ada tagihan tertunggak.</TD></TR>
                ) : (
                  Object.values(filteredSchedule.reduce((acc: any, item: any) => {
                    const key = item.sale_id || 'unknown';
                    if (!acc[key]) acc[key] = { 
                      customer: item.sale?.customer?.full_name || 'Tanpa Nama',
                      unit: item.sale?.unit?.unit_number || 'Tanpa Unit',
                      project: item.sale?.unit?.project?.name || '-',
                      items: [] 
                    };
                    acc[key].items.push(item);
                    return acc;
                  }, {})).map((group: any) => (
                    <React.Fragment key={group.customer + group.unit}>
                      {/* GROUP HEADER */}
                      <TR className="bg-accent-lavender/5">
                        <TD colSpan={5} className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-accent-dark font-black text-xs border border-accent-lavender/20">
                              {group.customer.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-text-primary text-sm tracking-tight">{group.customer}</div>
                              <div className="text-[10px] font-bold text-accent-dark uppercase tracking-widest">
                                {group.unit} • {group.project}
                              </div>
                            </div>
                          </div>
                        </TD>
                      </TR>
                      
                      {/* GROUP ITEMS */}
                      {group.items.map((inst: any) => {
                        const isOverdue = new Date(inst.due_date) < new Date() && inst.status === 'unpaid';
                        return (
                          <TR key={inst.id} className="hover:bg-slate-50/50 transition-colors border-l-4 border-l-transparent hover:border-l-accent-dark">
                            <TD className="px-6 py-4 pl-16">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-[11px] font-bold text-text-secondary">Cicilan #{group.items.indexOf(inst) + 1}</span>
                              </div>
                            </TD>
                            <TD className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className={cn("w-3.5 h-3.5", isOverdue ? "text-rose-500" : "text-text-muted")} />
                                <span className={cn("text-[11px] font-bold", isOverdue ? "text-rose-600" : "text-text-secondary")}>
                                  {formatDate(inst.due_date)}
                                </span>
                              </div>
                            </TD>
                            <TD className="px-6 py-4 text-right">
                              <div className="text-sm font-black text-text-primary">
                                {formatCurrency(inst.amount)}
                              </div>
                            </TD>
                            <TD className="px-6 py-4 text-center">
                              {inst.isPendingPayment ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 text-amber-600 uppercase">
                                  <Clock className="w-3 h-3" /> Menunggu Verifikasi
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black bg-rose-50 text-rose-600 uppercase border border-rose-100">
                                  <AlertCircle className="w-3 h-3" /> Terlambat
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-50 text-text-muted uppercase border border-slate-100">
                                  Belum Bayar
                                </span>
                              )}
                            </TD>
                            <TD className="px-6 py-4 text-right">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-accent-dark text-accent-dark hover:bg-accent-dark hover:text-white transition-all shadow-sm"
                                onClick={() => navigate('/consumer-payments')}
                              >
                                Bayar
                              </Button>
                            </TD>
                          </TR>
                        );
                      })}
                    </React.Fragment>
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
