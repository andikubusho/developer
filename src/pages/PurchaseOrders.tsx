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
      const [poData, prData, projData, supplierData, materialData, unitData, rabData] = await Promise.all([
        api.get('purchase_orders', 'select=*&order=created_at.desc'),
        api.get('purchase_requests', 'select=*&order=created_at.desc'),
        api.get('projects', 'select=id,name'),
        api.get('material_suppliers', 'select=id,name'),
        api.get('materials', 'select=id,name,unit,code'),
        api.get('units', 'select=id,unit_number'),
        api.get('rab_projects', 'select=id,nama_proyek,keterangan'),
      ]);

      const projMap: Record<string, string> = {};
      (projData || []).filter(Boolean).forEach((p: any) => { if (p.id) projMap[p.id] = p.name; });

      const supplierMap: Record<string, string> = {};
      (supplierData || []).filter(Boolean).forEach((s: any) => { if (s.id) supplierMap[s.id] = s.name; });

      const matMap: Record<string, any> = {};
      (materialData || []).filter(Boolean).forEach((m: any) => { if (m.id) matMap[m.id] = m; });

      const unitMap: Record<string, string> = {};
      (unitData || []).filter(Boolean).forEach((u: any) => { if (u.id) unitMap[u.id] = u.unit_number; });

      const rabMap: Record<string, string> = {};
      (rabData || []).filter(Boolean).forEach((r: any) => { if (r.id) rabMap[r.id] = r.keterangan; });

      // Enrich POs
      const enrichedPOs = (poData || []).filter(Boolean).map((po: any) => ({
        ...po,
        project: { name: projMap[po.project_id] || '-' },
        supplier: { name: supplierMap[po.supplier_id] || '-' },
      }));
      setOrders(enrichedPOs);
      
      // Flatten items from APPROVED/ordered PRs that don't have POs yet
      const approvedItems: PRItemForPO[] = [];
      (prData || []).filter(Boolean).forEach((pr: any) => {
        const prStatus = (pr.status || '').toUpperCase();
        if (prStatus === 'APPROVED') {
          (pr.items || []).filter(Boolean).forEach((item: any) => {
            const mat = matMap[item.material_id] || null;
            approvedItems.push({
              prId: pr.id,
              rab_project_id: pr.rab_project_id,
              project_id: pr.project_id,
              material_id: item.material_id,
              quantity: item.quantity,
              projectName: projMap[pr.project_id] || 'Unknown',
              unitNumber: unitMap[pr.unit_id] || '-',
              rabKeterangan: rabMap[pr.rab_project_id] || '',
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

  const [statusFilter, setStatusFilter] = useState('ALL');

  const handlePrint = (order: any) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const itemsHtml = Array.isArray(order.items) 
      ? order.items.map((item: any, idx: number) => `
          <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td>
              <div style="font-weight:bold">${item.material_name}</div>
              <div style="font-size:10px;color:#666">Merk: ${item.variant_name || item.merk || '-'}</div>
            </td>
            <td style="text-align:center">${item.quantity} ${item.unit || ''}</td>
            <td style="text-align:right">${formatCurrency(item.price || item.unit_price)}</td>
            <td style="text-align:right;font-weight:bold">${formatCurrency(item.subtotal || (item.price * item.quantity))}</td>
          </tr>
        `).join('')
      : `<tr><td style="text-align:center">1</td><td>${order.materials?.name || '-'}</td><td style="text-align:center">${order.quantity}</td><td style="text-align:right">${formatCurrency(order.unit_price)}</td><td style="text-align:right;font-weight:bold">${formatCurrency(order.total_price)}</td></tr>`;

    win.document.write(`
      <html><head><title>PO - ${order.po_number}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body{font-family:'Inter',Arial,sans-serif;padding:0;color:#1e293b;line-height:1.5}
        .header{display:flex;justify-content:space-between;margin-bottom:40px;border-bottom:4px solid #0f172a;padding-bottom:20px}
        .title{font-size:28px;font-weight:900;letter-spacing:-0.05em;margin:0;color:#0f172a}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px}
        .info-box h3{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px}
        .info-box p{font-size:14px;font-weight:700;margin:0}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;padding:12px 15px;border-bottom:2px solid #e2e8f0;text-align:left}
        td{padding:12px 15px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .total-section{margin-top:30px;padding:20px;background:#f8fafc;border-radius:12px;display:flex;justify-content:space-between;align-items:center}
        .total-label{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b}
        .total-amount{font-size:24px;font-weight:900;color:#0f172a}
        .signature-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;margin-top:60px;text-align:center}
        .signature-box{border-top:1px solid #cbd5e1;padding-top:10px;font-size:12px;font-weight:700;color:#64748b}
      </style>
      </head><body>
      <div class="header">
        <div>
          <h1 class="title">PURCHASE ORDER</h1>
          <p style="margin:4px 0;font-size:14px;color:#64748b">No: <span style="color:#0f172a;font-weight:900">${order.po_number || '-'}</span></p>
        </div>
        <div style="text-align:right">
          <p style="margin:0;font-size:12px;color:#64748b">Tanggal: <b style="color:#1e293b">${formatDate(order.date || order.created_at)}</b></p>
          <p style="margin:0;font-size:12px;color:#64748b">Jatuh Tempo: <b style="color:#1e293b">${formatDate(order.due_date)}</b></p>
        </div>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <h3>Supplier / Vendor</h3>
          <p>${order.supplier?.name || '-'}</p>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${order.supplier?.address || '-'}</div>
        </div>
        <div class="info-box">
          <h3>Referensi Proyek</h3>
          <p>${order.project?.name || '-'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:40px">No</th>
            <th>Item Material & Spesifikasi</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Harga Satuan</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-section" style="flex-direction:column;align-items:flex-end;gap:8px">
        <div style="display:flex;justify-content:space-between;width:250px;font-size:12px;color:#64748b">
          <span>SUBTOTAL</span>
          <span style="font-weight:bold;color:#1e293b">${formatCurrency(order.total_price)}</span>
        </div>
        ${order.include_ppn ? `
        <div style="display:flex;justify-content:space-between;width:250px;font-size:12px;color:#64748b">
          <span>PPN ${order.ppn_rate}%</span>
          <span style="font-weight:bold;color:#1e293b">${formatCurrency(order.ppn_amount)}</span>
        </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;width:250px;padding-top:8px;border-top:2px solid #e2e8f0;margin-top:4px">
          <span class="total-label" style="font-size:14px;color:#0f172a">GRAND TOTAL</span>
          <span class="total-amount">${formatCurrency(Number(order.total_price || 0) + Number(order.ppn_amount || 0))}</span>
        </div>
      </div>

      <div class="signature-grid">
        <div class="signature-box">Dibuat Oleh</div>
        <div class="signature-box">Disetujui Oleh</div>
        <div class="signature-box">Vendor</div>
      </div>

      <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);}</script>
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = (order.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (order.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Purchase Order</h1>
            <p className="text-slate-400 font-medium text-sm">Arsip dan pelacakan seluruh pesanan material</p>
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-accent-lavender transition-all text-sm font-semibold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border-2 border-slate-100">
            {['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  statusFilter === s ? "bg-white shadow-sm text-accent-dark ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s}
              </button>
            ))}
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
                    <TD className="font-bold">
                      {formatCurrency(Number(order.total_price || 0) + Number(order.ppn_amount || 0))}
                    </TD>
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
                        <button title="Detail" onClick={() => setViewingOrder(order)} className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 transition-colors">
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
                groups[item.prId] = { prId: item.prId, projectName: item.projectName, unitNumber: item.unitNumber, rabKeterangan: item.rabKeterangan, createdAt: item.createdAt, items: [] };
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
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary text-sm">{group.projectName}</span>
                    {group.rabKeterangan && (
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight italic -mt-1 opacity-60">
                        {group.rabKeterangan}
                      </span>
                    )}
                  </div>
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
            setIsModalOpen(false);
            setSelectedPR(null);
            setSelectedPRItems(undefined);
            setSelectedOrder(undefined);
            setSelectedItemKeys(new Set());
            fetchOrders();
          }}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedPR(null);
            setSelectedPRItems(undefined);
            setSelectedOrder(undefined);
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
                          <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Merk: {item.variant_name || item.merk || '-'}</div>
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
                        <TD className="text-right font-bold text-slate-700">{formatCurrency(item.price ?? item.unit_price)}</TD>
                        <TD className="text-right font-black text-slate-900">{formatCurrency((item.price ?? item.unit_price) * item.quantity)}</TD>
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

            <div className="p-6 bg-slate-100 border-2 border-slate-200 rounded-[24px] space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-black uppercase tracking-widest text-slate-400">Subtotal</span>
                <span className="font-bold text-slate-600">{formatCurrency(viewingOrder.total_price)}</span>
              </div>
              
              {viewingOrder.include_ppn && (
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="font-black uppercase tracking-widest text-slate-400">PPN {viewingOrder.ppn_rate}%</span>
                  <span className="font-bold text-slate-600">{formatCurrency(viewingOrder.ppn_amount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Total Akhir (Grand Total)</span>
                <span className="text-3xl font-black text-slate-900">
                  {formatCurrency(Number(viewingOrder.total_price || 0) + Number(viewingOrder.ppn_amount || 0))}
                </span>
              </div>
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
