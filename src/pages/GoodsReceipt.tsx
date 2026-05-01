import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  ArrowLeft, 
  Search, 
  Package, 
  Plus, 
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { formatNumber, formatDate } from '../lib/utils';

const GoodsReceipt: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    qty_diterima: 0,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get PENDING POs that are not yet fully received
      const data = await api.get('purchase_orders', 'select=*,project:projects(name),supplier:suppliers(name),master:materials(name,unit,code),variant:material_variants(merk)&status=eq.PENDING&order=created_at.desc');
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenGR = (po: any) => {
    setSelectedPO(po);
    setForm({
      tanggal: new Date().toISOString().split('T')[0],
      qty_diterima: po.quantity,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    
    setSubmitting(true);
    try {
      // Insert into goods_receipts
      // The DB Trigger will update material_variants.stok and insert into stock_movements
      await api.insert('goods_receipts', {
        tanggal: form.tanggal,
        po_id: selectedPO.id,
        material_id: selectedPO.material_id,
        id_variant: selectedPO.id_variant,
        qty: form.qty_diterima
      });

      // Update PO status to COMPLETED if fully received (simplified)
      await api.update('purchase_orders', selectedPO.id, { status: 'COMPLETED' });

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving GR:', err);
      alert('Gagal menyimpan Penerimaan Barang');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.po_number.toLowerCase().includes(search.toLowerCase()) ||
    o.project?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/materials')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Penerimaan Barang (GR)</h1>
            <p className="text-text-secondary font-medium">Pencatatan kedatangan material dari Supplier sesuai PO</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-accent-dark text-white border-none shadow-premium md:col-span-1 flex flex-col justify-between">
          <div>
            <Package className="w-8 h-8 text-accent-lavender mb-4" />
            <h3 className="font-black text-lg leading-tight mb-2">Menunggu Kedatangan</h3>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Total PO Aktif</p>
          </div>
          <p className="text-4xl font-black mt-4">{orders.length}</p>
        </Card>

        <Card className="md:col-span-3 p-6 bg-white border-none shadow-premium">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari No. PO, Proyek, atau Supplier..."
              className="pl-12 h-12 rounded-xl w-full border border-slate-200 bg-slate-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR isHoverable={false}>
                  <TH>PO / Tgl</TH>
                  <TH>Proyek & Supplier</TH>
                  <TH>Item (Variant)</TH>
                  <TH className="text-right">Qty Order</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR isHoverable={false}>
                    <TD colSpan={5} className="py-12 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent-dark" />
                    </TD>
                  </TR>
                ) : filteredOrders.length === 0 ? (
                  <TR isHoverable={false}>
                    <TD colSpan={5} className="py-12 text-center text-text-muted font-medium">Tidak ada PO yang menunggu kedatangan.</TD>
                  </TR>
                ) : filteredOrders.map(o => (
                  <TR key={o.id}>
                    <TD>
                      <div className="font-black text-accent-dark">{o.po_number}</div>
                      <div className="text-[10px] text-text-muted font-bold uppercase">{formatDate(o.created_at)}</div>
                    </TD>
                    <TD>
                      <div className="font-bold text-text-primary">{o.project?.name}</div>
                      <div className="text-xs text-text-secondary">{o.supplier?.name}</div>
                    </TD>
                    <TD>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-text-primary">{o.master?.name}</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Merk: {o.variant?.merk}</span>
                      </div>
                    </TD>
                    <TD className="text-right font-black text-text-primary">
                      {formatNumber(o.quantity)}
                      <span className="ml-1 text-[10px] text-text-muted uppercase">{o.master?.unit}</span>
                    </TD>
                    <TD className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenGR(o)}
                        className="rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-none"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Terima
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Konfirmasi Penerimaan Barang"
        size="lg"
      >
        {selectedPO && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Nomor PO</p>
                  <p className="font-black text-accent-dark">{selectedPO.po_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Supplier</p>
                  <p className="font-bold text-text-primary">{selectedPO.supplier?.name}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Item</p>
                <p className="text-lg font-black text-text-primary uppercase">{selectedPO.master?.name}</p>
                <p className="text-xs font-bold text-emerald-600 uppercase">Merk: {selectedPO.variant?.merk}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Tanggal Terima</label>
                <Input 
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="h-12 glass-input rounded-xl px-4 font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Kuantitas Diterima</label>
                <div className="relative">
                  <Input 
                    type="number"
                    value={form.qty_diterima}
                    onChange={(e) => setForm({ ...form, qty_diterima: Number(e.target.value) })}
                    className="h-12 glass-input rounded-xl px-4 font-black text-lg"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted uppercase">
                    {selectedPO.master?.unit}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Perhatian</p>
                <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                  Menyimpan data ini akan secara otomatis menambah saldo stok variant **{selectedPO.variant?.merk}** di sistem dan mencatat mutasi masuk.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-premium" isLoading={submitting}>
                Konfirmasi Terima
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default GoodsReceipt;
