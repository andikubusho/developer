import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  Package,
  Building2,
  Home,
  Trash2,
  PlusCircle,
  Search,
  Calculator,
  RefreshCw,
  Info,
  Eye,
  Edit,
  Download,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { Project } from '../types';

interface MasterMaterial {
  id: string;
  name: string;
  unit: string;
  code?: string;
}

const PurchaseRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [rabs, setRabs] = useState<any[]>([]);
  const [unitMap, setUnitMap] = useState<Record<string, any>>({});
  const [selectedRab, setSelectedRab] = useState<any | null>(null);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const [form, setForm] = useState({
    material_id: '',
    quantity: 1,
    description: ''
  });

  const [selectedBudgetInfo, setSelectedBudgetInfo] = useState<{
    quota: number;
    used: number;
    remaining: number;
    unit: string;
  } | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [rabData, reqData, projData, masterData, unitData] = await Promise.all([
        api.get('rab_projects', 'select=*&order=created_at.desc'),
        api.get('purchase_requests', 'select=*&order=created_at.desc'),
        api.get('projects', 'select=id,name'),
        api.get('materials', 'select=id,name,unit,code'),
        api.get('units', 'select=id,unit_number'),
      ]);

      const projectMap: Record<string, any> = {};
      (projData || []).forEach((p: any) => { projectMap[p.id] = p; });
      const unitMap: Record<string, any> = {};
      (unitData || []).forEach((u: any) => { unitMap[u.id] = u; });
      setUnitMap(unitMap);
      const masterMap: Record<string, any> = {};
      (masterData || []).forEach((m: any) => { masterMap[m.id] = m; });

      const enrichedReqs = (reqData || []).map((r: any) => ({
        ...r,
        project: r.project_id ? (projectMap[r.project_id] || null) : null,
        unit: r.unit_id ? (unitMap[r.unit_id] || null) : null,
        master: r.material_id ? (masterMap[r.material_id] || null) : null,
      }));

      setRabs(rabData || []);
      setRequests(enrichedReqs);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch material budget when RAB is selected
  useEffect(() => {
    if (selectedRab) {
      fetchBudgetStatus();
    } else {
      setBudgetItems([]);
      setSelectedBudgetInfo(null);
    }
  }, [selectedRab]);

  const fetchBudgetStatus = async () => {
    if (!selectedRab) return;
    try {
      setLoadingBudget(true);
      const status = await api.getBudgetStatus(selectedRab.id);
      setBudgetItems(status || []);
    } catch (err) {
      console.error('Error fetching budget status:', err);
    } finally {
      setLoadingBudget(false);
    }
  };

  // Update specific material info when selected
  useEffect(() => {
    if (form.material_id && budgetItems.length > 0) {
      const item = budgetItems.find(i => i.material_id === form.material_id);
      if (item) {
        setSelectedBudgetInfo({
          quota: item.quota,
          used: item.used,
          remaining: Math.max(0, item.quota - item.used),
          unit: item.unit
        });
      } else {
        setSelectedBudgetInfo(null);
      }
    } else {
      setSelectedBudgetInfo(null);
    }
  }, [form.material_id, budgetItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRab) return;

    if (selectedBudgetInfo && form.quantity > selectedBudgetInfo.remaining) {
      alert('Kuantitas melebihi sisa anggaran RAB!');
      return;
    }

    setSubmitting(true);
    try {
      await api.insert('purchase_requests', {
        project_id: selectedRab.project_id,
        unit_id: selectedRab.unit_id,
        material_id: form.material_id,
        items: [{ material_id: form.material_id, quantity: form.quantity }],
        item_name: form.description,
        status: 'PENDING'
      });
      setIsModalOpen(false);
      resetForm();
      fetchInitialData();
    } catch (err) {
      console.error('Error submitting PR:', err);
      alert('Gagal menyimpan PR');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRab(null);
    setForm({
      material_id: '',
      quantity: 1,
      description: ''
    });
    setSelectedBudgetInfo(null);
  };

  const [detailPR, setDetailPR] = useState<any | null>(null);
  const [editPR, setEditPR] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, description: '', status: 'PENDING' });

  const handleSaveEditPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPR) return;
    try {
      await api.update('purchase_requests', editPR.id, {
        items: [{ material_id: editPR.material_id, quantity: editForm.quantity }],
        item_name: editForm.description,
        status: editForm.status,
      });
      setRequests(prev => prev.map(r => r.id === editPR.id ? {
        ...r,
        items: [{ material_id: r.material_id, quantity: editForm.quantity }],
        item_name: editForm.description,
        status: editForm.status,
      } : r));
      setEditPR(null);
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  const handleDeletePR = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Hapus Purchase Request ini?')) return;
    try {
      await api.delete('purchase_requests', id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const handleDownloadPR = (e: React.MouseEvent, req: any) => {
    e.stopPropagation();
    const data = [{
      'No PR': `PR-${req.id.slice(0, 8).toUpperCase()}`,
      'Tanggal': formatDate(req.created_at),
      'Proyek': req.project?.name || '-',
      'Unit': req.unit?.unit_number || '-',
      'Kode Material': req.master?.code || '-',
      'Nama Material': req.master?.name || '-',
      'Qty': req.items?.[0]?.quantity || req.quantity || 0,
      'Satuan': req.master?.unit || '-',
      'Keterangan': req.item_name || '-',
      'Status': req.status,
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 30 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Request');
    XLSX.writeFile(wb, `PR-${req.id.slice(0, 8).toUpperCase()}.xlsx`);
  };

  const handlePrintPR = (e: React.MouseEvent, req: any) => {
    e.stopPropagation();
    const qty = req.items?.[0]?.quantity || req.quantity || 0;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PR-${req.id.slice(0,8).toUpperCase()}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:30px;color:#111}
      @media print{@page{size:A4;margin:15mm}}
      h2{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px}
      .sub{color:#666;font-size:11px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#1A1A2E;color:white;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px}
      td{padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:12px}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;
             background:${req.status==='APPROVED'?'#d1fae5':req.status==='REJECTED'?'#fee2e2':'#fef3c7'};
             color:${req.status==='APPROVED'?'#065f46':req.status==='REJECTED'?'#991b1b':'#92400e'}}
    </style></head><body>
    <h2>Purchase Request</h2>
    <div class="sub">No. PR-${req.id.slice(0,8).toUpperCase()} &nbsp;|&nbsp; ${formatDate(req.created_at)}</div>
    <table>
      <tr><th colspan="2">Informasi Purchase Request</th></tr>
      <tr><td style="width:35%;color:#555;font-weight:600">Proyek</td><td><strong>${req.project?.name||'-'}</strong></td></tr>
      <tr><td style="color:#555;font-weight:600">Unit</td><td>${req.unit?.unit_number||'-'}</td></tr>
      <tr><td style="color:#555;font-weight:600">Material</td><td><strong>${req.master?.name||'Material Deleted'}</strong> (${req.master?.code||'-'})</td></tr>
      <tr><td style="color:#555;font-weight:600">Kuantitas</td><td><strong>${qty} ${req.master?.unit||''}</strong></td></tr>
      <tr><td style="color:#555;font-weight:600">Keterangan</td><td>${req.item_name||'-'}</td></tr>
      <tr><td style="color:#555;font-weight:600">Status</td><td><span class="badge">${req.status}</span></td></tr>
    </table>
    <div style="margin-top:40px;display:flex;justify-content:flex-end">
      <div style="text-align:center">
        <div style="margin-bottom:50px;font-size:11px;color:#555">Disetujui oleh,</div>
        <div style="border-top:1px solid #111;padding-top:4px;font-size:11px;min-width:160px">( ___________________ )</div>
      </div>
    </div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
    const win = window.open('', '_blank', 'width=800,height:600');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const isExceeding = selectedBudgetInfo && form.quantity > selectedBudgetInfo.remaining;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Purchase Requests</h1>
            <p className="text-text-secondary">Permintaan pengadaan berbasis Anggaran Proyek (RAB)</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-xl h-11 px-6 shadow-premium">
          <Plus className="w-4 h-4 mr-2" />
          PR Baru (Dari RAB)
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-premium bg-white">
        <Table>
          <THead>
            <TR isHoverable={false}>
              <TH>No. PR / Tgl</TH>
              <TH>Proyek & Unit</TH>
              <TH>Material (Master)</TH>
              <TH className="text-right">Qty</TH>
              <TH>Status</TH>
              <TH className="text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR isHoverable={false}>
                <TD colSpan={6} className="text-center py-12">
                  <RefreshCw className="animate-spin mx-auto text-accent-dark" />
                </TD>
              </TR>
            ) : requests.length === 0 ? (
              <TR isHoverable={false}>
                <TD colSpan={6} className="text-center py-12 text-text-muted font-medium">Tidak ada data permintaan.</TD>
              </TR>
            ) : (
              requests.map((req) => (
                <TR key={req.id}>
                  <TD className="py-4">
                    <div className="font-black text-accent-dark">PR-{req.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[10px] text-text-muted font-bold uppercase">{formatDate(req.created_at)}</div>
                  </TD>
                  <TD>
                    <div className="font-bold text-text-primary">{req.project?.name || '-'}</div>
                    <div className="text-xs text-text-secondary">Unit: {req.unit?.unit_number || '-'}</div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-black text-slate-600">{req.master?.code || '-'}</div>
                      <div className="font-black text-text-primary uppercase text-sm">{req.master?.name || 'Material Deleted'}</div>
                    </div>
                  </TD>
                  <TD className="text-right font-black text-text-primary">
                    {formatNumber((req.items?.[0]?.quantity || req.quantity || 0))}
                    <span className="ml-1 text-[10px] text-text-muted uppercase">{req.master?.unit}</span>
                  </TD>
                  <TD>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      req.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {req.status}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setDetailPR(req); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); setEditPR(req); setEditForm({ quantity: req.items?.[0]?.quantity || req.quantity || 0, description: req.item_name || '', status: req.status }); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        onClick={(e) => handleDownloadPR(e, req)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-violet-600 hover:bg-violet-50 rounded-lg"
                        onClick={(e) => handlePrintPR(e, req)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={(e) => handleDeletePR(e, req.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {/* Detail Modal */}
      {detailPR && (
        <Modal isOpen={!!detailPR} onClose={() => setDetailPR(null)} title="Detail Purchase Request" size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['No. PR', `PR-${detailPR.id.slice(0,8).toUpperCase()}`],
                ['Tanggal', formatDate(detailPR.created_at)],
                ['Proyek', detailPR.project?.name || '-'],
                ['Unit', detailPR.unit?.unit_number || '-'],
                ['Material', detailPR.master?.name || 'Material Deleted'],
                ['Kode', detailPR.master?.code || '-'],
                ['Kuantitas', `${formatNumber(detailPR.items?.[0]?.quantity || detailPR.quantity || 0)} ${detailPR.master?.unit || ''}`],
                ['Keterangan', detailPR.item_name || '-'],
              ].map(([label, value]) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-sm font-bold text-slate-700">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                detailPR.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                detailPR.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>{detailPR.status}</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" className="h-10 rounded-xl" onClick={() => setDetailPR(null)}>Tutup</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editPR && (
        <Modal isOpen={!!editPR} onClose={() => setEditPR(null)} title="Edit Purchase Request" size="sm">
          <form onSubmit={handleSaveEditPR} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
              <p className="text-sm font-bold text-slate-700">{editPR.master?.name || 'Material Deleted'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Kuantitas</label>
              <Input
                type="number"
                className="h-12 rounded-xl font-bold"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 0 })}
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Status</label>
              <select
                className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Keterangan</label>
              <textarea
                className="w-full p-4 glass-input rounded-xl text-sm font-medium focus:outline-none"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={() => setEditPR(null)}>Batal</Button>
              <Button type="submit" className="h-11 rounded-xl px-6 font-black shadow-premium">Simpan</Button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="Buat Purchase Request (Budget Controlled)"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Pilih RAB */}
          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Pilih Referensi RAB Proyek</label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={selectedRab?.id || ''}
              onChange={(e) => {
                const rab = rabs.find(r => r.id === e.target.value);
                setSelectedRab(rab || null);
                setForm({ ...form, material_id: '' });
              }}
              required
            >
              <option value="">-- Pilih RAB Proyek & Unit --</option>
              {rabs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.nama_proyek}{r.unit_id ? ` - Unit ${unitMap[r.unit_id]?.unit_number || r.unit_id}` : ''} - {formatDate(r.created_at)}
                </option>
              ))}
            </select>
          </div>

          {selectedRab && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyek Terpilih</p>
                <p className="text-sm font-black text-slate-700">{selectedRab.nama_proyek}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</p>
                <p className="text-sm font-black text-slate-700">{selectedRab.unit_id ? (unitMap[selectedRab.unit_id]?.unit_number || selectedRab.unit_id) : 'Seluruh Proyek'}</p>
              </div>
            </div>
          )}

          {/* Step 2: Pilih Material dari RAB */}
          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Pilih Material dari RAB</label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none disabled:opacity-50"
              value={form.material_id}
              onChange={(e) => setForm({ ...form, material_id: e.target.value })}
              required
              disabled={!selectedRab || loadingBudget}
            >
              <option value="">{loadingBudget ? 'Menghitung sisa anggaran...' : '-- Pilih Material --'}</option>
              {budgetItems.map(m => (
                <option key={m.material_id} value={m.material_id} disabled={m.quota <= m.used}>
                  {m.name} {m.quota <= m.used ? '(Budget Habis)' : `(Sisa: ${formatNumber(m.quota - m.used)} ${m.unit})`}
                </option>
              ))}
            </select>
            <div className="px-2 py-1 bg-blue-50 rounded-lg flex items-center gap-2">
              <Info className="w-3 h-3 text-blue-600" />
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Hanya material yang terdaftar di RAB terpilih yang muncul.</p>
            </div>
          </div>

          {/* Step 3: Budget Info & Qty */}
          {selectedBudgetInfo && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 animate-in zoom-in-95">
               <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Kuota RAB</p>
                    <p className="text-sm font-black text-slate-600">{formatNumber(selectedBudgetInfo.quota)} {selectedBudgetInfo.unit}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sudah PR</p>
                    <p className="text-sm font-black text-slate-600">{formatNumber(selectedBudgetInfo.used)} {selectedBudgetInfo.unit}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sisa Anggaran</p>
                    <p className={`text-sm font-black ${selectedBudgetInfo.remaining > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatNumber(selectedBudgetInfo.remaining)} {selectedBudgetInfo.unit}
                    </p>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Kuantitas Permintaan</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      className={`h-14 rounded-xl px-4 font-black text-xl border-2 transition-all ${isExceeding ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                      min="0.1"
                      step="0.1"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted uppercase tracking-widest">
                      {selectedBudgetInfo.unit}
                    </div>
                  </div>
                  {isExceeding && (
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-tight flex items-center gap-1.5 ml-1">
                      ⚠️ Permintaan melebihi sisa anggaran RAB!
                    </p>
                  )}
               </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Keterangan / Alasan</label>
            <textarea 
              className="w-full p-4 glass-input rounded-xl text-sm font-medium focus:outline-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Contoh: Stok menipis, kebutuhan untuk cor lantai 2..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
            <Button 
              type="submit" 
              className="h-12 rounded-xl px-8 font-black shadow-premium disabled:opacity-50" 
              isLoading={submitting}
              disabled={isExceeding || !form.material_id || form.quantity <= 0}
            >
              Simpan Permintaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequests;

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('id-ID').format(num);
};
