import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Truck, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { SupplierPayment, PurchaseOrder, SPK } from '../types';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

const SupplierPaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDivision } = useAuth();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [opnames, setOpnames] = useState<any[]>([]);
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
    spk_id: '',
    opname_id: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchReferences();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.get('supplier_payment', 'select=*&order=created_at.desc');
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferences = async () => {
    try {
      const [poData, spkData, opData] = await Promise.all([
        api.get('purchase_orders', 'select=*'),
        api.get('spks', 'select=*'),
        api.get('project_opnames', 'status=eq.approved')
      ]);
      
      setPurchaseOrders(poData || []);
      setSpks(spkData || []);
      setOpnames(opData || []);
    } catch (error) {
      console.error('Error fetching references:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingId) {
        await api.update('supplier_payment', editingId, formData);
      } else {
        await api.insert('supplier_payment', formData);
      }

      // Sync Opname status if paid
      if (formData.opname_id && formData.status === 'paid') {
        await api.update('project_opnames', formData.opname_id, { status: 'paid' });
      }

      await fetchPayments();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Gagal menyimpan pembayaran');
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
      spk_id: payment.spk_id || '',
      opname_id: payment.opname_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pembayaran ini?')) return;
    try {
      setLoading(true);
      await api.delete('supplier_payment', id);
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Gagal menghapus pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'paid' | 'pending') => {
    try {
      setLoading(true);
      await api.update('supplier_payment', id, { status });
      
      // Find the payment to sync with opname
      const payment = payments.find(p => p.id === id);
      if (payment?.opname_id && status === 'paid') {
        await api.update('project_opnames', payment.opname_id, { status: 'paid' });
      }

      await fetchPayments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status');
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
      spk_id: '',
      opname_id: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-white/40 text-text-primary';
    }
  };

  const filteredPayments = payments.filter(item => 
    item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Pembayaran Keuangan</h1>
            <p className="text-text-secondary">Manajemen Pembayaran Supplier, SPK & Opname Upah</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Input Pembayaran
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nama supplier atau vendor..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>

        <Table className="min-w-[800px]">
            <THead>
              <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
                <TH className="px-6 py-3 font-semibold">Tanggal Bayar</TH>
                <TH className="px-6 py-3 font-semibold">Supplier / Sumber</TH>
                <TH className="px-6 py-3 font-semibold">Ref. Tagihan</TH>
                <TH className="px-6 py-3 font-semibold text-right">Nilai Bayar</TH>
                <TH className="px-6 py-3 font-semibold">Metode</TH>
                <TH className="px-6 py-3 font-semibold">Status</TH>
                <TH className="px-6 py-3 font-semibold text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={7} className="px-6 py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div></TD></TR>
              ) : filteredPayments.length === 0 ? (
                <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">Tidak ada data pembayaran.</TD></TR>
              ) : (
                filteredPayments.map((item) => (
                  <TR key={item.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-6 py-4 text-sm text-text-secondary">{formatDate(item.payment_date)}</TD>
                    <TD className="px-6 py-4 text-sm font-medium text-text-primary">{item.supplier_name}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                      {item.po_id ? `PO #${item.po_id}` : item.spk_id ? `SPK #${item.spk_id}` : item.opname_id ? `OPNAME #${item.opname_id.substring(0, 6)}` : '-'}
                    </TD>
                    <TD className="px-6 py-4 text-sm font-bold text-text-primary text-right">{formatCurrency(item.amount)}</TD>
                    <TD className="px-6 py-4 text-sm text-text-secondary">{item.payment_method}</TD>
                    <TD className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', getStatusColor(item.status))}>{item.status}</span>
                    </TD>
                    <TD className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" title="Set Paid" onClick={() => handleStatusUpdate(item.id, 'paid')}><CheckCircle className="w-4 h-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "Edit Pembayaran" : "Input Pembayaran Baru"}>
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Referensi Tagihan (PO/SPK/Opname)</label>
            <select className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" value={formData.po_id ? `po_${formData.po_id}` : formData.spk_id ? `spk_${formData.spk_id}` : formData.opname_id ? `op_${formData.opname_id}` : ''} onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('po_')) {
                const id = val.replace('po_', '');
                const po = purchaseOrders.find(p => p.id === id);
                setFormData({ ...formData, po_id: id, spk_id: '', opname_id: '', supplier_name: po?.supplier_name || '', amount: po?.total_amount || 0 });
              } else if (val.startsWith('spk_')) {
                const id = val.replace('spk_', '');
                const spk = spks.find(s => s.id === id);
                setFormData({ ...formData, po_id: '', spk_id: id, opname_id: '', supplier_name: spk?.contractor_name || '', amount: spk?.total_value || 0 });
              } else if (val.startsWith('op_')) {
                const id = val.replace('op_', '');
                const op = opnames.find(o => o.id === id);
                // For opname, we might need to fetch the total amount from its items if not available in master
                // ProjectOpname interface shows amount: number
                setFormData({ ...formData, po_id: '', spk_id: '', opname_id: id, supplier_name: op?.worker_name || 'Mandor/Kontraktor', amount: op?.amount || 0 });
              } else {
                setFormData({ ...formData, po_id: '', spk_id: '', opname_id: '', supplier_name: '', amount: 0 });
              }
            }} required>
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
              <optgroup label="Opname Upah (Approved)">
                {opnames.map(op => (
                  <option key={op.id} value={`op_${op.id}`}>OPNAME {formatDate(op.date)} - {op.worker_name} ({formatCurrency(op.amount || 0)})</option>
                ))}
              </optgroup>
            </select>
          </div>
          <Input label="Nama Supplier / Sumber" placeholder="Terisi otomatis" value={formData.supplier_name} disabled />
          <Input label="Nilai Pembayaran (Rp)" type="number" placeholder="Rp 0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Pembayaran" type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Metode Pembayaran</label>
              <select className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} required>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Cek / Giro">Cek / Giro</option>
                <option value="Tunai">Tunai</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button type="submit" isLoading={loading}>{editingId ? "Update Pembayaran" : "Simpan Pembayaran"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupplierPaymentsPage;
