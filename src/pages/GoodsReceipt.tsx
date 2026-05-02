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
  AlertCircle,
  Eye,
  Trash2,
  UserCheck
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
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [receivingItems, setReceivingItems] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    worker_id: '',
  });
  const [workers, setWorkers] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get PENDING POs
      const [orderData, historyData] = await Promise.all([
        api.get('purchase_orders', 'select=*,project:projects(name),supplier:suppliers(name),master:materials(name,unit,code),variant:material_variants(merk,stok)&status=eq.PENDING&order=created_at.desc'),
        api.get('goods_receipts', 'select=*,po:purchase_orders(po_number),material:materials(name,unit),variant:material_variants(merk),worker:worker_masters(name)&order=tanggal.desc&limit=20')
      ]);
      setOrders(orderData || []);
      setHistory(historyData || []);
    } catch (err) {
      console.error('Error fetching POs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    const data = await api.get('worker_masters', 'select=id,name,type&status=eq.active&order=name.asc');
    setWorkers(data || []);
  };

  useEffect(() => {
    fetchData();
    fetchWorkers();
  }, []);

  const handleOpenGR = (po: any) => {
    setSelectedPO(po);
    const items = Array.isArray(po.items) 
      ? po.items.map((it: any) => ({ ...it, checked: true, qty_received: it.quantity }))
      : [{ 
          material_id: po.material_id, 
          material_name: po.master?.name, 
          id_variant: po.id_variant, 
          variant_name: po.variant?.merk,
          quantity: po.quantity,
          qty_received: po.quantity,
          unit: po.master?.unit,
          checked: true 
        }];
    setReceivingItems(items);
    setForm({
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    
    setSubmitting(true);
    const selectedItems = receivingItems.filter(it => it.checked && it.qty_received > 0);
    if (selectedItems.length === 0) {
      alert('Pilih minimal satu item dengan kuantitas lebih dari 0');
      setSubmitting(false);
      return;
    }
    
    try {
      // Loop through selected items and insert GR
      for (const it of selectedItems) {
        const grResponse = await api.insert('goods_receipts', {
          tanggal: form.tanggal,
          po_id: selectedPO.id,
          material_id: it.material_id,
          id_variant: it.id_variant,
          qty: it.qty_received,
          worker_id: form.worker_id || null
        });

        // Ambil stok terbaru varian ini untuk akurasi saldo (mencegah race condition sederhana)
        const vRows = await api.get('material_variants', `id=eq.${it.id_variant}&select=stok`);
        const currentStok = Number(vRows?.[0]?.stok) || 0;
        const newStok = currentStok + it.qty_received;

        // CATAT MUTASI STOK
        await api.insert('stock_movements', {
          id_variant: it.id_variant,
          tanggal: new Date().toISOString(),
          tipe: 'IN',
          qty: it.qty_received,
          saldo_setelah: newStok,
          sumber: 'GR',
          reference_id: grResponse?.[0]?.id || 'Manual',
          keterangan: `${selectedPO.project?.name || 'UMUM'} | Terima dari PO: ${selectedPO.po_number}${form.worker_id ? ` | Penerima: ${workers.find(w => w.id === form.worker_id)?.name}` : ''}`,
          worker_id: form.worker_id || null
        });

        // UPDATE STOK FISIK
        await api.update('material_variants', it.id_variant, { stok: newStok });
      }

      // Update PO status if all items received (simplified)
      // For now, mark as COMPLETED if any receipt made
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

  const handleDeleteGR = async (gr: any) => {
    if (!confirm(`Batalkan penerimaan barang "${gr.material?.name}"? Stok akan dikurangi kembali.`)) return;

    try {
      setLoading(true);
      // 1. Hapus Log Mutasi Terkait agar Kartu Stok sinkron
      const movements = await api.get('stock_movements', `sumber=eq.GR&reference_id=eq.${gr.id}`);
      if (movements && movements.length > 0) {
        await api.delete('stock_movements', movements[0].id);
      }

      // 2. Kembalikan Saldo Stok di Material Variants
      const vRows = await api.get('material_variants', `id=eq.${gr.id_variant}&select=stok`);
      const currentStok = Number(vRows?.[0]?.stok) || 0;
      const restoredStok = currentStok - Number(gr.qty); // Kurangi lagi karena ini pembatalan penerimaan
      await api.update('material_variants', gr.id_variant, { stok: restoredStok });

      // 3. Hapus data GR
      await api.delete('goods_receipts', gr.id);
      
      // 4. Kembalikan status PO ke PENDING agar muncul lagi di antrean terima
      if (gr.po_id) {
        await api.update('purchase_orders', gr.po_id, { status: 'PENDING' });
      }
      
      await fetchData();
    } catch (err) {
      console.error('Error deleting GR:', err);
      alert('Gagal menghapus riwayat penerimaan.');
    } finally {
      setLoading(false);
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
                      <div className="flex flex-col gap-1.5">
                        {Array.isArray(o.items) ? (
                          o.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex flex-col border-l-2 border-accent-dark/20 pl-2 py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-text-primary leading-tight">{it.material_name}</span>
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-500">{it.quantity} {it.unit}</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Merk: {it.variant_name || it.merk}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <span className="text-sm font-black text-text-primary">{o.master?.name}</span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Merk: {o.variant?.merk}</span>
                          </>
                        )}
                      </div>
                    </TD>
                    <TD className="text-right font-black text-text-primary">
                      {Array.isArray(o.items) 
                        ? o.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0)
                        : formatNumber(o.quantity)
                      }
                      <span className="ml-1 text-[10px] text-text-muted uppercase">
                        {Array.isArray(o.items) ? 'Total' : o.master?.unit}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button title="Detail PO" onClick={() => setViewingOrder(o)} className="p-2 rounded-xl text-sky-500 hover:bg-sky-50 transition-colors">
                          <Eye className="w-5 h-5" />
                        </button>
                        <Button 
                          size="sm" 
                          onClick={() => handleOpenGR(o)}
                          className="rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-none"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Terima
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Riwayat Penerimaan */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-black text-text-primary tracking-tight">Riwayat Penerimaan Terbaru</h2>
        </div>
        
        <Card className="p-6 bg-white border-none shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR isHoverable={false} className="bg-slate-50/50">
                  <TH>No. PO / Tanggal Terima</TH>
                  <TH>Material & Merk</TH>
                  <TH className="text-right">Kuantitas Masuk</TH>
                  <TH>Penerima</TH>
                  <TH className="text-right">Status</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR isHoverable={false}><TD colSpan={5} className="py-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-300" /></TD></TR>
                ) : history.length === 0 ? (
                  <TR isHoverable={false}><TD colSpan={5} className="py-8 text-center text-slate-400 italic">Belum ada riwayat penerimaan.</TD></TR>
                ) : history.map((h, i) => (
                  <TR key={i}>
                    <TD>
                      <div className="font-black text-slate-700">{h.po?.po_number || 'PO-Manual'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(h.tanggal)}</div>
                    </TD>
                    <TD>
                      <div className="font-bold text-slate-800">{h.material?.name}</div>
                      <div className="text-[10px] font-black text-emerald-600 uppercase">Merk: {h.variant?.merk}</div>
                    </TD>
                    <TD className="text-right font-black text-emerald-700">
                      + {formatNumber(h.qty)} <span className="text-[10px] uppercase text-slate-400">{h.material?.unit}</span>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-accent-dark" />
                        <span className="text-xs font-bold text-slate-700">{h.worker?.name || 'Umum'}</span>
                      </div>
                    </TD>
                    <TD className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-tighter">
                        <CheckCircle2 className="w-3 h-3" /> Berhasil
                      </span>
                    </TD>
                    <TD className="text-right">
                      <button 
                        onClick={() => handleDeleteGR(h)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Batalkan Penerimaan"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
        title="Input Penerimaan Barang"
        size="4xl"
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

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Tanggal Terima</label>
                  <Input 
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="h-10 glass-input rounded-xl px-4 font-bold text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Penerima (Mandor/Staff)</label>
                  <select 
                    className="h-10 glass-input rounded-xl px-4 font-bold text-sm border border-slate-200"
                    value={form.worker_id}
                    onChange={(e) => setForm({ ...form, worker_id: e.target.value })}
                  >
                    <option value="">-- Pilih Penerima --</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-hidden border-2 border-slate-100 rounded-[24px]">
                <Table>
                  <THead>
                    <TR className="bg-slate-50">
                      <TH className="w-12"></TH>
                      <TH className="text-[10px] font-black uppercase tracking-widest">Material</TH>
                      <TH className="text-right text-[10px] font-black uppercase tracking-widest">Qty Order</TH>
                      <TH className="text-right text-[10px] font-black uppercase tracking-widest">Qty Terima</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {receivingItems.map((it, idx) => (
                      <TR key={idx} className={it.checked ? 'bg-white' : 'bg-slate-50/50 opacity-60'}>
                        <TD className="py-3">
                          <input 
                            type="checkbox" 
                            checked={it.checked}
                            onChange={(e) => {
                              const newItems = [...receivingItems];
                              newItems[idx].checked = e.target.checked;
                              setReceivingItems(newItems);
                            }}
                            className="w-5 h-5 rounded-lg border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </TD>
                        <TD>
                          <p className="font-bold text-slate-800">{it.material_name}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Merk: {it.variant_name || it.merk}</p>
                        </TD>
                        <TD className="text-right font-black text-slate-500">
                          {it.quantity} <span className="text-[10px] uppercase">{it.unit}</span>
                        </TD>
                        <TD className="text-right">
                          <Input 
                            type="number"
                            disabled={!it.checked}
                            value={it.qty_received}
                            onChange={(e) => {
                              const newItems = [...receivingItems];
                              newItems[idx].qty_received = Number(e.target.value);
                              setReceivingItems(newItems);
                            }}
                            className="h-10 w-24 text-right rounded-xl border-2 border-slate-100 font-black focus:border-emerald-500"
                          />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
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
              <Button type="submit" className="flex-1 h-12 rounded-xl font-black bg-accent-dark hover:bg-slate-800 text-white shadow-premium" isLoading={submitting}>
                Konfirmasi Penerimaan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detail PO */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Detail Purchase Order: ${viewingOrder?.po_number}`}
        size="4xl"
      >
        {viewingOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[24px] border-2 border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</p>
                <p className="font-black text-slate-800">{viewingOrder.supplier?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyek</p>
                <p className="font-black text-slate-800">{viewingOrder.project?.name || '-'}</p>
              </div>
            </div>

            <div className="overflow-hidden border-2 border-slate-100 rounded-[24px]">
              <Table>
                <THead>
                  <TR className="bg-slate-50">
                    <TH className="text-[10px] font-black uppercase tracking-widest">Material</TH>
                    <TH className="text-right text-[10px] font-black uppercase tracking-widest">Kuantitas Pesan</TH>
                  </TR>
                </THead>
                <TBody>
                  {Array.isArray(viewingOrder.items) ? viewingOrder.items.map((item: any, i: number) => (
                    <TR key={i}>
                      <TD className="py-4">
                        <p className="font-bold text-slate-800">{item.material_name}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Merk: {item.variant_name || item.merk}</p>
                      </TD>
                      <TD className="text-right font-black text-slate-800">{item.quantity}</TD>
                    </TR>
                  )) : (
                    <TR>
                      <TD className="py-4">
                        <p className="font-bold text-slate-800">{viewingOrder.master?.name}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Merk: {viewingOrder.variant?.merk}</p>
                      </TD>
                      <TD className="text-right font-black text-slate-800">{viewingOrder.quantity}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewingOrder(null)} variant="ghost" className="rounded-xl font-black">Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GoodsReceipt;
