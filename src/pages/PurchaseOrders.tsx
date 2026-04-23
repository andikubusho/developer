import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Package, Truck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PurchaseOrder, Material } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatCurrency } from '../lib/utils';
import { PurchaseOrderForm } from '../components/forms/PurchaseOrderForm';
import { useAuth } from '../contexts/AuthContext';
import { getMockData, saveMockData } from '../lib/storage';

const PurchaseOrders: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | undefined>();

  useEffect(() => {
    if (division === 'marketing') {
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
          },
          {
            id: '2',
            po_number: 'PO-2026-002',
            material_id: '2',
            supplier: 'UD. Pasir Jaya',
            quantity: 10,
            unit_price: 250000,
            total_price: 2500000,
            status: 'pending',
            order_date: new Date().toISOString(),
            materials: { name: 'Pasir Beton', unit: 'm3' },
            created_at: new Date().toISOString(),
          }
        ];
        setOrders(getMockData<PurchaseOrder>('purchase_orders', defaultOrders));
        return;
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, materials(*)')
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (isMockMode) {
      setMaterials([
        { id: '1', name: 'Semen Tiga Roda', unit: 'sak', stock: 50, min_stock: 10, created_at: '', updated_at: '' },
        { id: '2', name: 'Pasir Beton', unit: 'm3', stock: 5, min_stock: 8, created_at: '', updated_at: '' }
      ]);
      return;
    }
    const { data } = await supabase.from('materials').select('*');
    setMaterials(data || []);
  };

  const handleStatusUpdate = async (id: string, status: PurchaseOrder['status'], materialId: string, quantity: number) => {
    if (isMockMode) {
      const updatedOrders = orders.map(o => o.id === id ? { ...o, status } : o);
      setOrders(updatedOrders);
      saveMockData('purchase_orders', updatedOrders);

      // If received, update material stock in mock data
      if (status === 'received') {
        const currentMaterials = getMockData<Material>('materials', []);
        const updatedMaterials = currentMaterials.map(m => 
          m.id === materialId ? { ...m, stock: m.stock + quantity } : m
        );
        saveMockData('materials', updatedMaterials);
        fetchMaterials();
      }
      return;
    }
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // If received, update material stock
      if (status === 'received') {
        const material = materials.find(m => m.id === materialId);
        if (material) {
          await supabase
            .from('materials')
            .update({ stock: material.stock + quantity })
            .eq('id', materialId);
        }
      }

      fetchOrders();
      fetchMaterials();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
            <p className="text-slate-500">Kelola pemesanan material proyek</p>
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
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari PO atau supplier..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">No. PO</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Material</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Tidak ada data PO.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{order.po_number}</div>
                      <div className="text-xs text-slate-500">{formatDate(order.order_date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{(order as any).materials?.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{order.supplier}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{order.quantity} {(order as any).materials?.unit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{formatCurrency(order.total_price)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status === 'pending' ? 'Pending' :
                         order.status === 'shipped' ? 'Dikirim' :
                         order.status === 'received' ? 'Diterima' : 'Dibatalkan'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => handleStatusUpdate(order.id, 'shipped', order.material_id, order.quantity)}
                          >
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleStatusUpdate(order.id, 'received', order.material_id, order.quantity)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOrder ? 'Edit Purchase Order' : 'Tambah Purchase Order'}
        size="lg"
      >
        <PurchaseOrderForm
          materials={materials}
          onSuccess={(values) => {
            if (isMockMode && values) {
              const material = materials.find(m => m.id === values.material_id);
              const newOrder: any = {
                id: Math.random().toString(36).substr(2, 9),
                po_number: `PO-${Date.now().toString().slice(-6)}`,
                ...values,
                total_price: values.quantity * values.unit_price,
                status: 'pending',
                materials: material ? { name: material.name, unit: material.unit } : null,
                created_at: new Date().toISOString(),
              };
              const updatedOrders = [newOrder, ...orders];
              setOrders(updatedOrders);
              saveMockData('purchase_orders', updatedOrders);
            }
            setIsModalOpen(false);
            if (!isMockMode) fetchOrders();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default PurchaseOrders;


