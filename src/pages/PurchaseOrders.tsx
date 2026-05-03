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
  ClipboardList,
  Eye,
  Pencil,
  Download,
  Printer
} from 'lucide-react';
import { api } from '../lib/api';
import { PurchaseOrder, Material, PRItemForPO } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatCurrency, cn } from '../lib/utils';
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
  const [approvedPRItems, setApprovedPRItems] = useState<PRItemForPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | undefined>();
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [receivedData, setReceivedData] = useState<Record<string, number>>({});
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [selectedPR, setSelectedPR] = useState<any | null>(null);
  const [selectedPRItems, setSelectedPRItems] = useState<PRItemForPO[] | undefined>();
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const [poQueue, setPoQueue] = useState<any[]>([]);

  const toggleItem = (key: string) => {
    setSelectedItemKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleBuatPOGroup = (group: any) => {
    const selected = group.items.filter((_: any, idx: number) => selectedItemKeys.has(`${group.prId}-${idx}`));
    if (selected.length === 0) return;
    
    // Jika lebih dari 1 item, gunakan mode batch
    if (selected.length > 1) {
      setSelectedPRItems(selected);
      setSelectedPR(null);
    } else {
      setSelectedPR(selected[0]);
      setSelectedPRItems(undefined);
    }
    
    setIsModalOpen(true);
  };

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

      // Fetch all necessary data for enrichment
      const [poData, prData, projData, supplierData, materialData, unitData] = await Promise.all([
        api.get('purchase_orders', 'select=*&order=created_at.desc'),
        api.get('purchase_requests', 'select=*&order=created_at.desc'),
        api.get('projects', 'select=id,name'),
        api.get('material_suppliers', 'select=id,name'),
        api.get('materials', 'select=id,name,unit,code'),
        api.get('units', 'select=id,unit_number'),
      ]);

      const projMap: Record<string, string> = {};
      (projData || []).forEach((p: any) => { projMap[p.id] = p.name; });

      const supplierMap: Record<string, string> = {};
      (supplierData || []).forEach((s: any) => { supplierMap[s.id] = s.name; });

      const matMap: Record<string, any> = {};
      (materialData || []).forEach((m: any) => { matMap[m.id] = m; });

      const unitMap: Record<string, string> = {};
      (unitData || []).forEach((u: any) => { unitMap[u.id] = u.unit_number; });

      // Enrich POs
      const enrichedPOs = (poData || []).map((po: any) => ({
        ...po,
        project: { name: projMap[po.project_id] || '-' },
        supplier: { name: supplierMap[po.supplier_id] || '-' },
      }));
      setOrders(enrichedPOs);
      
      // Flatten items from APPROVED/ordered PRs that don't have POs yet
      // (Actually showing only APPROVED for PO creation)
      const approvedItems: PRItemForPO[] = [];
      (prData || []).forEach((pr: any) => {
        const prStatus = (pr.status || '').toUpperCase();
        if (prStatus === 'APPROVED') {
          (pr.items || []).forEach((item: any) => {
            const mat = matMap[item.material_id] || null;
            approvedItems.push({
              prId: pr.id,
              rab_project_id: pr.rab_project_id,
              project_id: pr.project_id,
              material_id: item.material_id,
              quantity: item.quantity,
              projectName: projMap[pr.project_id] || 'Unknown',
              unitNumber: unitMap[pr.unit_id] || '-',
              master: mat,
              createdAt: pr.created_at
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

  const handleDelete = async (id: string, poNumber: string) => {
    if (!confirm(`Hapus PO ${poNumber}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await api.delete('purchase_orders', id);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting PO:', error);
      alert('Gagal menghapus PO.');
    }
  };

  const handlePrint = (order: any) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const itemsHtml = Array.isArray(order.items) 
      ? order.items.map((item: any) => `
          <tr>
            <td>${item.material_name}</td>
            <td style="text-align:right">${item.quantity}</td>
            <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
            <td style="text-align:right">${formatCurrency(item.subtotal)}</td>
          </tr>
        `).join('')
      : `<tr><td>${order.materials?.name || '-'}</td><td style="text-align:right">${order.quantity}</td><td style="text-align:right">${formatCurrency(order.unit_price)}</td><td style="text-align:right">${formatCurrency(order.total_price)}</td></tr>`;

    win.document.write(`
      <html><head><title>PO - ${order.po_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#333}
        .header{display:flex;justify-content:between;border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:24px}
        h2{margin:0;color:#1a1a2e}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ddd;padding:12px;text-align:left}
        th{background:#f8f9fa;font-size:12px;text-transform:uppercase}
        .footer{margin-top:32px;text-align:right;font-size:18px;font-weight:bold}
      </style>
      </head><body>
      <div class="header">
        <div>
          <h2>PURCHASE ORDER</h2>
          <p style="margin:4px 0">No. PO: <b>${order.po_number || '-'}</b></p>
        </div>
        <div style="text-align:right">
          <p style="margin:0">Tanggal: ${formatDate(order.date)}</p>
          <p style="margin:0">Jatuh Tempo: ${formatDate(order.due_date)}</p>
        </div>
      </div>
      <p><b>Proyek:</b> ${order.project?.name || '-'}</p>
      <p><b>Supplier:</b> ${order.supplier?.name || '-'}</p>
      <table>
        <thead>
          <tr>
            <th>Deskripsi Material</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Harga Satuan</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="footer">
        Total: ${formatCurrency(order.total_price)}
      </div>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleDownload = (order: any) => {
    const rows = [
      ['No. PO', order.po_number || '-'],
      ['Status', order.status],
      ['Proyek', order.project?.name || '-'],
      ['Supplier', order.supplier?.name || '-'],
      ['Tanggal Order', order.order_date ? formatDate(order.order_date) : '-'],
      ['Jatuh Tempo', order.due_date ? formatDate(order.due_date) : '-'],
      ['Qty', order.quantity || '-'],
      ['Harga Satuan', order.unit_price || 0],
      ['Total', order.total_price || 0],
    ];
    const csv = rows.map(r => `"${r[0]}","${r[1]}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.po_number || 'PO'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
                <TH>Jatuh Tempo</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR>
                  <TD colSpan={7} className="text-center py-8">
                    <div className="flex justify-center"><RefreshCw className="animate-spin" /></div>
                  </TD>
                </TR>
              ) : filteredOrders.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center py-8 text-text-secondary">Tidak ada data PO.</TD>
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
                    <TD>
                      <div className={cn(
                        "font-medium",
                        order.due_date && new Date(order.due_date) < new Date() && order.status !== 'COMPLETED' ? "text-rose-600" : "text-text-secondary"
                      )}>
                        {order.due_date ? formatDate(order.due_date) : '-'}
                      </div>
                    </TD>
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
                      <div className="flex items-center justify-end gap-1">
                        <button title="Detail" onClick={() => handleViewDetail(order)} className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button title="Edit" onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button title="Download CSV" onClick={() => handleDownload(order)} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button title="Print" onClick={() => handlePrint(order)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button title="Hapus" onClick={() => handleDelete(order.id, order.po_number)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
      </Card>
      
      {/* Approved PR Items Section — grouped by PR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-text-primary">PR Disetujui (Belum PO)</h2>
          <span className="text-xs font-black text-text-secondary uppercase tracking-widest">
            {Object.keys(approvedPRItems.reduce((a: any, i) => { a[i.prId] = 1; return a; }, {})).length} PR
          </span>
        </div>

        {approvedPRItems.length === 0 ? (
          <Card>
            <div className="py-10 text-center text-text-secondary text-sm">Tidak ada PR yang menunggu PO</div>
          </Card>
        ) : (
          Object.values(
            approvedPRItems.reduce((groups: any, item) => {
              if (!groups[item.prId]) {
                groups[item.prId] = { prId: item.prId, projectName: item.projectName, unitNumber: item.unitNumber, createdAt: item.createdAt, items: [] };
              }
              groups[item.prId].items.push(item);
              return groups;
            }, {})
          ).map((group: any) => (
            <Card key={group.prId} className="overflow-hidden">
              {/* PR Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-accent-dark text-white text-[11px] font-black tracking-widest">
                    PR-{group.prId.slice(0, 6).toUpperCase()}
                  </span>
                  <span className="font-bold text-text-primary text-sm">{group.projectName}</span>
                  {group.unitNumber && group.unitNumber !== '-' && (
                    <span className="text-xs text-text-secondary">· Unit {group.unitNumber}</span>
                  )}
                </div>
                <span className="text-xs text-text-secondary">{formatDate(group.createdAt)}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-50">
                {group.items.map((item: any, idx: number) => {
                  const key = `${group.prId}-${idx}`;
                  const checked = selectedItemKeys.has(key);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      onClick={() => toggleItem(key)}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-accent-dark border-accent-dark' : 'border-slate-300'}`}>
                        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-black text-slate-500 shrink-0">
                        {item.master?.code || '-'}
                      </span>
                      <span className="font-semibold text-text-primary text-sm flex-1">{item.master?.name || '-'}</span>
                      <span className="text-sm font-black text-text-primary w-12 text-right">{item.quantity}</span>
                    </div>
                  );
                })}
              </div>

              {/* Tombol Buat PO muncul jika ada item terpilih di grup ini */}
              {group.items.some((_: any, idx: number) => selectedItemKeys.has(`${group.prId}-${idx}`)) && (
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    {group.items.filter((_: any, idx: number) => selectedItemKeys.has(`${group.prId}-${idx}`)).length} item dipilih
                  </span>
                  <Button size="sm" variant="outline" className="rounded-xl font-black" onClick={() => handleBuatPOGroup(group)}>
                    Buat PO
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPR(null);
          setSelectedPRItems(undefined);
          setSelectedOrder(undefined);
        }}
        title={selectedOrder ? 'Edit Purchase Order' : 'Tambah Purchase Order'}
        size="5xl"
      >
        <PurchaseOrderForm
          onSuccess={() => {
            if (poQueue.length > 0) {
              setSelectedPR(poQueue[0]);
              setPoQueue(prev => prev.slice(1));
            } else {
              setIsModalOpen(false);
              setSelectedPR(null);
              setSelectedPRItems(undefined);
              setSelectedOrder(undefined);
              setSelectedItemKeys(new Set());
              fetchOrders();
            }
          }}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedPR(null);
            setSelectedOrder(undefined);
            setPoQueue([]);
            setSelectedItemKeys(new Set());
          }}
          initialPR={selectedPR}
          initialOrder={selectedOrder}
          initialPRItems={selectedPRItems}
        />
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
            <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-[24px] border-2 border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</p>
                <p className="font-black text-slate-800">{viewingOrder.supplier?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyek</p>
                <p className="font-black text-slate-800">{viewingOrder.project?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Order</p>
                <p className="font-black text-slate-800">{formatDate(viewingOrder.date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jatuh Tempo</p>
                <p className="font-black text-slate-800">{formatDate(viewingOrder.due_date)}</p>
              </div>
            </div>

            <div className="overflow-hidden border-2 border-slate-100 rounded-[24px]">
              <Table>
                <THead>
                  <TR className="bg-slate-50">
                    <TH className="text-[10px] font-black uppercase tracking-widest">Material</TH>
                    <TH className="text-right text-[10px] font-black uppercase tracking-widest">Qty</TH>
                    <TH className="text-right text-[10px] font-black uppercase tracking-widest">Diterima</TH>
                    <TH className="text-right text-[10px] font-black uppercase tracking-widest">Status</TH>
                    <TH className="text-right text-[10px] font-black uppercase tracking-widest">Harga</TH>
                    <TH className="text-right text-[10px] font-black uppercase tracking-widest">Subtotal</TH>
                  </TR>
                </THead>
                <TBody>
                  {Array.isArray(viewingOrder.items) ? viewingOrder.items.map((item: any, i: number) => {
                    const key = `${item.material_id}_${item.id_variant}`;
                    const received = receivedData[key] || 0;
                    const isFullyReceived = received >= Number(item.quantity);
                    
                    return (
                      <TR key={i}>
                        <TD className="py-4">
                          <div className="font-bold text-slate-800">{item.material_name}</div>
                          <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Merk: {item.variant_name || item.merk}</div>
                        </TD>
                        <TD className="text-right font-black text-slate-700">{item.quantity}</TD>
                        <TD className="text-right font-black text-emerald-600">
                          {loadingReceived ? '...' : received}
                        </TD>
                        <TD className="text-right">
                          {loadingReceived ? (
                            <span className="w-2 h-2 rounded-full bg-slate-200 animate-pulse inline-block"></span>
                          ) : isFullyReceived ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Diterima</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-black uppercase">Pending</span>
                          )}
                        </TD>
                        <TD className="text-right font-bold text-slate-700">{formatCurrency(item.price)}</TD>
                        <TD className="text-right font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</TD>
                      </TR>
                    );
                  }) : (
                    <TR>
                      <TD className="py-4">
                        <div className="font-bold text-slate-800">{viewingOrder.master?.name}</div>
                        <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Merk: {viewingOrder.variant?.merk}</div>
                      </TD>
                      <TD className="text-right font-black text-slate-700">{viewingOrder.quantity}</TD>
                      <TD className="text-right font-black text-emerald-600">-</TD>
                      <TD className="text-right">-</TD>
                      <TD className="text-right font-bold text-slate-700">{formatCurrency(viewingOrder.total_price / viewingOrder.quantity)}</TD>
                      <TD className="text-right font-black text-slate-900">{formatCurrency(viewingOrder.total_price)}</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </div>

            <div className="p-6 bg-accent-dark text-white rounded-[24px] flex justify-between items-center shadow-xl">
              <span className="text-xs font-black uppercase tracking-widest opacity-60">Total Pembelian</span>
              <span className="text-2xl font-black">{formatCurrency(viewingOrder.total_price)}</span>
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

export default PurchaseOrders;
