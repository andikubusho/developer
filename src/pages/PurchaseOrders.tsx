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
  XCircle,
  ClipboardList
} from 'lucide-react';
import { api } from '../lib/api';
import { PurchaseOrder, Material } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatCurrency } from '../lib/utils';
import { PurchaseOrderForm } from '../components/forms/PurchaseOrderForm';
import { useAuth } from '../contexts/AuthContext';
import { getMockData, saveMockData } from '../lib/storage';

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
  const { isMockMode, division } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [approvedPRItems, setApprovedPRItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | undefined>();

  useEffect(() => {
    if (division === 'marketing' || division === 'teknik' || division === 'audit') {
      fetchOrders();
      fetchMaterials();
    } else {
      setLoading(false);
    }
  }, [division]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      if (isMockMode) {
        const defaultOrders: any[] = [
          {
            id: '1',
            po_number: 'PO-2026-001',
            material_id: '1',
            supplier: 'PT. Semen Indonesia',
            quantity: 100,
            unit_price: 65000,
            total_price: 6500000,
            status: 'received',
            order_date: new Date().toISOString(),
            materials: { name: 'Semen Tiga Roda', unit: 'sak' },
            created_at: new Date().toISOString(),
          }
        ];
        setOrders(getMockData<PurchaseOrder>('purchase_orders', defaultOrders));
        return;
      }

      // Use the standardized api utility
      const poData = await api.get('purchase_orders', 'select=*,project:projects(name),supplier:suppliers(name)&order=created_at.desc');
      const prData = await api.get('purchase_requests', 'select=*,project:projects(name),unit:units(unit_number)&order=created_at.desc');
      
      console.log('📦 Purchase Orders Response:', poData);
      setOrders(poData);
      
      // Flatten items from APPROVED PRs
      const approvedItems: any[] = [];
      prData.forEach((pr: any) => {
        if (pr.status === 'APPROVED') {
          (pr.items || []).forEach((item: any) => {
            approvedItems.push({
              ...item,
              prId: pr.id,
              projectName: pr.project?.name || 'Unknown',
              unitNumber: pr.unit?.unit_number || '-',
              createdAt: pr.createdAt
            });
          });
        }
      });
      setApprovedPRItems(approvedItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (isMockMode) {
      setMaterials([
        { id: '1', name: 'Semen Tiga Roda', unit: 'sak', stock: 50, min_stock: 10, created_at: '', updated_at: '' }
      ]);
      return;
    }
    const data = await api.get('materials', 'select=*');
    setMaterials(data);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.update('purchase_orders', id, { status });
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredOrders = orders.filter(order => 
    (order.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="p-2 h-auto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Purchase Orders</h1>
            <p className="text-text-secondary">Kelola pemesanan material proyek</p>
          </div>
        </div>
        <Button onClick={() => {
          setSelectedOrder(undefined);
          setIsModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          PO Baru
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Cari PO atau supplier..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/40 focus:outline-none focus:border-accent-lavender transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/20">
                <TH>No. PO</TH>
                <TH>Proyek</TH>
                <TH>Supplier</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={6} className="text-center py-8">
                    <div className="flex justify-center"><RefreshCw className="animate-spin" /></div>
                  </TD>
                </TR>
              ) : filteredOrders.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-center py-8 text-text-secondary">Tidak ada data PO.</TD>
                </TR>
              ) : (
                filteredOrders.map((order) => (
                  <TR key={order.id}>
                    <TD>
                      <div className="font-bold">{order.po_number}</div>
                      <div className="text-xs text-text-secondary">{formatDate(order.created_at)}</div>
                    </TD>
                    <TD>{order.project?.name || '-'}</TD>
                    <TD>{order.supplier?.name || '-'}</TD>
                    <TD className="font-bold">{formatCurrency(order.total_price)}</TD>
                    <TD>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                        order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.status}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                        Detail
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
      
      {/* Approved PR Items Section */}
      <Card>
        <div className="p-4 border-b border-white/40">
          <h2 className="text-lg font-bold">PR Disetujui (Belum PO)</h2>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Proyek</TH>
              <TH>Unit</TH>
              <TH>Material</TH>
              <TH>Qty</TH>
              <TH>Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {approvedPRItems.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center py-4 text-text-secondary text-sm">Tidak ada PR yang menunggu PO</TD>
              </TR>
            ) : (
              approvedPRItems.map((item, idx) => (
                <TR key={idx}>
                  <TD>{item.projectName}</TD>
                  <TD>{item.unitNumber}</TD>
                  <TD>{item.material_id}</TD>
                  <TD>{item.quantity}</TD>
                  <TD>
                    <Button size="sm" variant="outline">Buat PO</Button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOrder ? 'Edit Purchase Order' : 'Tambah Purchase Order'}
        size="lg"
      >
        <PurchaseOrderForm
          materials={materials}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchOrders();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
