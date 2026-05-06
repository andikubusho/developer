import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Truck, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  CheckCircle2,
  Calendar,
  Wallet
} from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';
import { SupplierPaymentModal } from '../components/modals/SupplierPaymentModal';

interface PayableRow {
  id: string;
  po_number: string;
  order_date: string;
  due_date: string;
  supplier_name: string;
  total_price: number;
  total_paid: number;
  balance: number;
  status: string;
  project_name: string;
}

const SupplierPayables: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [selectedPO, setSelectedPO] = useState<PayableRow | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poData, paymentsData] = await Promise.all([
        api.get('purchase_orders', 'select=*,project:projects(name),supplier:suppliers(name)&status=neq.CANCELLED&order=due_date.asc'),
        api.get('supplier_payment', 'select=*&status=eq.paid')
      ]);

      const rows: PayableRow[] = (poData || []).map((po: any) => {
        const poPayments = (paymentsData || []).filter((p: any) => p.po_id === po.id);
        const totalPaid = poPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const balance = Math.max(0, (Number(po.total_price) || 0) - totalPaid);

        return {
          id: po.id,
          po_number: po.po_number,
          order_date: po.created_at,
          due_date: po.due_date,
          supplier_name: po.supplier?.name || 'Unknown',
          total_price: Number(po.total_price) || 0,
          total_paid: totalPaid,
          balance: balance,
          status: po.status,
          project_name: po.project?.name || '-'
        };
      });

      setPayables(rows);
    } catch (error) {
      console.error('Error fetching payables:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return payables.filter(item => {
      const matchesSearch = 
        item.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isPaid = item.balance <= 0;
      if (!showPaid && isPaid) return false;
      
      return matchesSearch;
    });
  }, [payables, searchTerm, showPaid]);

  const agingStats = useMemo(() => {
    const today = new Date();
    const stats = {
      totalOutstanding: 0,
      totalOverdue: 0,
      current: 0,
      d30: 0,
      d60: 0,
      d90: 0,
      over90: 0
    };

    payables.forEach(item => {
      if (item.balance <= 0) return;

      stats.totalOutstanding += item.balance;
      
      const dueDate = new Date(item.due_date);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 0) {
        stats.current += item.balance;
      } else {
        stats.totalOverdue += item.balance;
        if (diffDays <= 30) stats.d30 += item.balance;
        else if (diffDays <= 60) stats.d60 += item.balance;
        else if (diffDays <= 90) stats.d90 += item.balance;
        else stats.over90 += item.balance;
      }
    });

    return stats;
  }, [payables]);

  const getStatusLabel = (item: PayableRow) => {
    if (item.balance <= 0) return { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700' };
    
    const dueDate = new Date(item.due_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (dueDate < today) {
      const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      return { label: `Overdue ${diff} Hari`, cls: 'bg-red-50 text-red-700' };
    }
    
    if (dueDate.getTime() === today.getTime()) {
      return { label: 'Jatuh Tempo Hari Ini', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
    }
    
    return { label: 'Belum Jatuh Tempo', cls: 'bg-blue-50 text-blue-700' };
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Hutang Supplier</h1>
            <p className="text-text-secondary font-medium text-sm">Monitoring & Pembayaran Kewajiban Supplier</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-none shadow-premium bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-lavender/10 text-accent-dark rounded-xl shadow-3d-inset">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">Total Outstanding</p>
              <p className="text-xl font-black text-text-primary tracking-tight">{formatCurrency(agingStats.totalOutstanding)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border-none shadow-premium bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Overdue</p>
              <p className="text-xl font-black text-red-600">{formatCurrency(agingStats.totalOverdue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-none shadow-premium bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Aman (Current)</p>
              <p className="text-xl font-black text-emerald-600">{formatCurrency(agingStats.current)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-none shadow-premium bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Akan Jatuh Tempo</p>
              <p className="text-xl font-black text-amber-600">{payables.filter(p => p.balance > 0).length} PO</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Aging Analysis */}
      <Card className="p-6 border-none shadow-premium bg-white">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-dark" /> Aging Report — Umur Hutang
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Belum JT', value: agingStats.current, cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
            { label: '1 – 30 Hari', value: agingStats.d30, cls: 'border-amber-200 bg-amber-50 text-amber-700' },
            { label: '31 – 60 Hari', value: agingStats.d60, cls: 'border-orange-200 bg-orange-50 text-orange-700' },
            { label: '61 – 90 Hari', value: agingStats.d90, cls: 'border-red-200 bg-red-50 text-red-700' },
            { label: '> 90 Hari', value: agingStats.over90, cls: 'border-red-400 bg-red-100 text-red-800' },
          ].map(b => (
            <div key={b.label} className={cn('p-4 rounded-xl border-2 text-center', b.cls)}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1 whitespace-nowrap">{b.label}</p>
              <p className="text-sm font-black">{formatCurrency(b.value)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari PO atau supplier..." 
              className="pl-10" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={cn(
                "w-10 h-5 rounded-full transition-all relative",
                showPaid ? "bg-accent-dark" : "bg-gray-200"
              )}>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={showPaid} 
                  onChange={() => setShowPaid(!showPaid)} 
                />
                <div className={cn(
                  "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all",
                  showPaid ? "translate-x-5" : ""
                )} />
              </div>
              <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors">Tampilkan Lunas</span>
            </label>
            <Button variant="outline" size="sm" onClick={fetchData}><Filter className="w-4 h-4 mr-2" /> Segarkan</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-[10px] uppercase tracking-wider font-black">
                <TH className="px-4 py-3">PO & Supplier</TH>
                <TH className="px-4 py-3">Proyek</TH>
                <TH className="px-4 py-3">Jatuh Tempo</TH>
                <TH className="px-4 py-3 text-right">Total PO</TH>
                <TH className="px-4 py-3 text-right">Sudah Bayar</TH>
                <TH className="px-4 py-3 text-right">Sisa Hutang</TH>
                <TH className="px-4 py-3 text-center">Status</TH>
                <TH className="px-4 py-3 text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={8} className="py-20 text-center text-text-muted font-bold uppercase tracking-widest text-[10px]">Sinkronisasi Data...</TD></TR>
              ) : filteredData.length === 0 ? (
                <TR><TD colSpan={8} className="py-20 text-center text-text-secondary">Tidak ada data hutang ditemukan.</TD></TR>
              ) : (
                filteredData.map((row) => {
                  const status = getStatusLabel(row);
                  return (
                    <TR key={row.id} className="hover:bg-white/20 transition-all">
                      <TD className="px-4 py-4">
                        <div className="font-black text-text-primary text-xs">{row.po_number}</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase">{row.supplier_name}</div>
                      </TD>
                      <TD className="px-4 py-4 text-[10px] font-bold text-text-secondary uppercase">{row.project_name}</TD>
                      <TD className="px-4 py-4">
                        <div className="text-xs font-bold text-text-primary">{formatDate(row.due_date)}</div>
                        <div className="text-[9px] text-text-muted">Dibuat: {formatDate(row.order_date)}</div>
                      </TD>
                      <TD className="px-4 py-4 text-right font-bold text-text-primary text-xs">{formatCurrency(row.total_price)}</TD>
                      <TD className="px-4 py-4 text-right font-bold text-emerald-600 text-xs">{formatCurrency(row.total_paid)}</TD>
                      <TD className="px-4 py-4 text-right font-black text-accent-dark text-xs">{formatCurrency(row.balance)}</TD>
                      <TD className="px-4 py-4 text-center">
                        <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap", status.cls)}>
                          {status.label}
                        </span>
                      </TD>
                      <TD className="px-4 py-4 text-right">
                        {row.balance > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-lg text-accent-dark hover:bg-accent-lavender/20 font-black text-[10px] uppercase tracking-wider"
                            onClick={() => {
                              setSelectedPO(row);
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            <Wallet className="w-3.5 h-3.5 mr-1.5" /> Bayar
                          </Button>
                        )}
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      {isPaymentModalOpen && selectedPO && (
        <SupplierPaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          po={selectedPO}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default SupplierPayables;
