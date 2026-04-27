import React, { useEffect, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Package, 
  Truck, 
  CheckCircle2, 
  ArrowLeft,
  RefreshCw,
  FileText,
  Clock,
  XCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatDate, formatCurrency, cn } from '../lib/utils';

interface PO {
  id: string;
  po_number: string;
  projectId: string;
  supplierId: number;
  total_price: string | number;
  status: string;
  created_at: string;
  project_name?: string;
  supplier_name?: string;
}

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/purchase-orders');
      const data = await res.json();
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'received': return { label: 'DITERIMA', color: 'bg-emerald-100 text-emerald-600 border-emerald-200', icon: CheckCircle2 };
      case 'shipped': return { label: 'DIKIRIM', color: 'bg-blue-100 text-blue-600 border-blue-200', icon: Truck };
      case 'cancelled': return { label: 'DIBATALKAN', color: 'bg-rose-100 text-rose-600 border-rose-200', icon: XCircle };
      default: return { label: 'PENDING', color: 'bg-amber-100 text-amber-600 border-amber-200', icon: Clock };
    }
  };

  const filteredOrders = orders.filter(order => 
    order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Purchase Orders</h1>
            <p className="text-text-secondary font-medium">Monitoring pemesanan material ke supplier</p>
          </div>
        </div>
        <Button onClick={() => alert('Fitur buat PO manual sedang disiapkan. Silakan gunakan alur PR -> Approval -> PO.')} className="rounded-xl h-12 px-8 shadow-glass">
          <Plus className="w-5 h-5 mr-2" /> Buat PO Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-none shadow-premium flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Pesanan</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{orders.length} PO</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="p-6 border-b border-white/20 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              placeholder="Cari PO, supplier, atau proyek..." 
              className="pl-12 h-12 glass-input border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 rounded-xl bg-white border-white/40" onClick={fetchOrders}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading ? "animate-spin" : "")} /> Segarkan
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full">
            <THead>
              <TR isHoverable={false}>
                <TH>No. PO</TH>
                <TH>Proyek</TH>
                <TH>Supplier</TH>
                <TH className="text-right">Total Nilai</TH>
                <TH className="text-center">Status</TH>
                <TH>Tanggal</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading && orders.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={7} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-accent-dark animate-spin mx-auto mb-4" />
                    <p className="text-text-muted font-bold uppercase text-[10px] tracking-widest">Memuat Data PO...</p>
                  </TD>
                </TR>
              ) : filteredOrders.length === 0 ? (
                <TR isHoverable={false}>
                  <TD colSpan={7} className="py-20 text-center text-text-muted">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase text-[10px] tracking-widest">Tidak ada Purchase Order ditemukan</p>
                  </TD>
                </TR>
              ) : filteredOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <TR key={order.id}>
                    <TD className="font-black text-text-primary text-sm uppercase tracking-tight">
                      {order.po_number || `PO-${order.id.substring(0,6)}`}
                    </TD>
                    <TD className="font-bold text-text-secondary text-xs">{order.project_name || '-'}</TD>
                    <TD className="font-bold text-text-primary text-xs">{order.supplier_name || '-'}</TD>
                    <TD className="text-right font-black text-accent-dark">
                      {formatCurrency(Number(order.total_price))}
                    </TD>
                    <TD className="text-center">
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-black border tracking-widest flex items-center justify-center w-fit mx-auto gap-1", badge.color)}>
                        <badge.icon className="w-3 h-3" /> {badge.label}
                      </span>
                    </TD>
                    <TD className="text-xs text-text-muted font-bold">{formatDate(order.created_at)}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" className="rounded-xl hover:bg-accent-lavender/10 text-primary">
                        Detail
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default PurchaseOrders;
