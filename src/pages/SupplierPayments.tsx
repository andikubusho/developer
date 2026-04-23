import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Truck, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { SupplierPayment, PurchaseOrder, SPK } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { getMockData, saveMockData } from '../lib/storage';

const SupplierPaymentsPage: React.FC = () => {
  const { isMockMode, division, setDivision } = useAuth();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Transfer Bank',
    status: 'pending' as const,
    po_id: '',
    spk_id: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchReferences();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const mockPayments: SupplierPayment[] = [
          {
            id: '1',
            po_id: '1',
            supplier_name: 'Toko Bangunan Jaya',
            amount: 15000000,
            payment_date: '2026-03-25',
            payment_method: 'Transfer Bank',
            status: 'paid'
          },
          {
            id: '2',
            spk_id: '1',
            supplier_name: 'PT Bangun Sejahtera',
            amount: 45000000,
            payment_date: '2026-04-01',
            payment_method: 'Transfer Bank',
            status: 'pending'
          }
        ];
        setPayments(getMockData<SupplierPayment>('supplier_payments', mockPayments));
        return;
      }

      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferences = async () => {
    try {
      if (isMockMode) {
        setPurchaseOrders(getMockData<PurchaseOrder>('purchase_orders', []));
        setSpks(getMockData<SPK>('spks', []));
        return;
      }

      const { data: poData } = await supabase.from('purchase_orders').select('*');
      const { data: spkData } = await supabase.from('spks').select('*');
      
      setPurchaseOrders(poData || []);
      setSpks(spkData || []);
    } catch (error) {
      console.error('Error fetching references:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (isMockMode) {
        const currentPayments = getMockData<SupplierPayment>('supplier_payments', []);
        if (editingId) {
          const updatedPayments = currentPayments.map(p => p.id === editingId ? { ...p, ...formData } : p);
          saveMockData('supplier_payments', updatedPayments);
          setPayments(updatedPayments);
        } else {
          const newPayment: SupplierPayment = {
            id: Math.random().toString(36).substr(2, 9),
            ...formData
          };
          const updatedPayments = [newPayment, ...currentPayments];
          saveMockData('supplier_payments', updatedPayments);
          setPayments(updatedPayments);
        }
        setIsModalOpen(false);
        resetForm();
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('supplier_payments')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_payments')
          .insert([formData]);
        if (error) throw error;
      }

      fetchPayments();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payment: SupplierPayment) => {
    setEditingId(payment.id);
    setFormData({
      supplier_name: payment.supplier_name,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      status: payment.status,
      po_id: payment.po_id || '',
      spk_id: payment.spk_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pembayaran ini?')) return;
    
    try {
      setLoading(true);
      if (isMockMode) {
        const currentPayments = getMockData<SupplierPayment>('supplier_payments', []);
        const updatedPayments = currentPayments.filter(p => p.id !== id);
        saveMockData('supplier_payments', updatedPayments);
        setPayments(updatedPayments);
        return;
      }

      const { error } = await supabase
        .from('supplier_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'paid' | 'pending') => {
    try {
      setLoading(true);
      if (isMockMode) {
        const currentPayments = getMockData<SupplierPayment>('supplier_payments', []);
        const updatedPayments = currentPayments.map(p => p.id === id ? { ...p, status } : p);
        saveMockData('supplier_payments', updatedPayments);
        setPayments(updatedPayments);
        return;
      }

      const { error } = await supabase
        .from('supplier_payments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchPayments();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      supplier_name: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Transfer Bank',
      status: 'pending',
      po_id: '',
      spk_id: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredPayments = payments.filter(item => 
    item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900">Pembayaran Supplier</h1>
            <p className="text-slate-500">Manajemen Hutang ke Supplier & Kontraktor</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Input Pembayaran
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nama supplier atau vendor..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tanggal Bayar</th>
                <th className="px-6 py-3 font-semibold">Supplier / Vendor</th>
                <th className="px-6 py-3 font-semibold">Ref. PO/SPK</th>
                <th className="px-6 py-3 font-semibold text-right">Nilai Bayar</th>
                <th className="px-6 py-3 font-semibold">Metode</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada data pembayaran supplier.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.payment_date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.po_id ? `PO #${item.po_id}` : `SPK #${item.spk_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.payment_method}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        getStatusColor(item.status)
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-green-600"
                            onClick={() => handleStatusUpdate(item.id, 'paid')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? "Edit Pembayaran Supplier" : "Input Pembayaran Supplier"}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Referensi Tagihan (PO/SPK)</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.po_id ? `po_${formData.po_id}` : formData.spk_id ? `spk_${formData.spk_id}` : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('po_')) {
                  const id = val.replace('po_', '');
                  const po = purchaseOrders.find(p => p.id === id);
                  setFormData({ ...formData, po_id: id, spk_id: '', supplier_name: po?.supplier_name || '', amount: po?.total_amount || 0 });
                } else if (val.startsWith('spk_')) {
                  const id = val.replace('spk_', '');
                  const spk = spks.find(s => s.id === id);
                  setFormData({ ...formData, po_id: '', spk_id: id, supplier_name: spk?.contractor_name || '', amount: spk?.total_value || 0 });
                } else {
                  setFormData({ ...formData, po_id: '', spk_id: '', supplier_name: '', amount: 0 });
                }
              }}
              required
            >
              <option value="">-- Pilih Tagihan --</option>
              <optgroup label="Purchase Orders">
                {purchaseOrders.map(po => (
                  <option key={po.id} value={`po_${po.id}`}>PO #{po.id} - {po.supplier_name} ({formatCurrency(po.total_amount)})</option>
                ))}
              </optgroup>
              <optgroup label="SPK Kontraktor">
                {spks.map(spk => (
                  <option key={spk.id} value={`spk_${spk.id}`}>SPK #{spk.spk_number} - {spk.contractor_name} ({formatCurrency(spk.total_value)})</option>
                ))}
              </optgroup>
            </select>
          </div>
          <Input 
            label="Nama Supplier / Vendor" 
            placeholder="Terisi otomatis dari referensi" 
            value={formData.supplier_name}
            disabled 
          />
          <Input 
            label="Nilai Pembayaran (Rp)" 
            type="number" 
            placeholder="Rp 0" 
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tanggal Pembayaran" 
              type="date" 
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Metode Pembayaran</label>
              <select 
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Cek / Giro">Cek / Giro</option>
                <option value="Tunai">Tunai</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit">{editingId ? "Update Pembayaran" : "Simpan Pembayaran"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupplierPaymentsPage;



