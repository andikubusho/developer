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
  });

  const [prItems, setPrItems] = useState<any[]>([]);
  const [description, setDescription] = useState('');

  const [selectedBudgetInfo, setSelectedBudgetInfo] = useState<{
    quota: number;
    used: number;
    remaining: number;
    unit: string;
    name: string;
  } | null>(null);

  const [editingPRId, setEditingPRId] = useState<string | null>(null);

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
      const uMap: Record<string, any> = {};
      (unitData || []).forEach((u: any) => { uMap[u.id] = u; });
      setUnitMap(uMap);
      const masterMap: Record<string, any> = {};
      (masterData || []).forEach((m: any) => { masterMap[m.id] = m; });

      const enrichedReqs = (reqData || []).map((r: any) => {
        // Find matching RAB by rab_project_id (primary) or fallback to project+unit
        const matchingRab = (rabData || []).find(rab => 
          rab.id === r.rab_project_id || 
          (rab.project_id === r.project_id && rab.unit_id === r.unit_id)
        );

        return {
          ...r,
          project: r.project_id ? (projectMap[r.project_id] || null) : null,
          unit: r.unit_id ? (uMap[r.unit_id] || null) : null,
          master: r.material_id ? (masterMap[r.material_id] || null) : null,
          rab_title: matchingRab?.keterangan || null
        };
      });

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
          unit: item.unit,
          name: item.name
        });
      } else {
        setSelectedBudgetInfo(null);
      }
    } else {
      setSelectedBudgetInfo(null);
    }
  }, [form.material_id, budgetItems]);

  const handleAddItem = () => {
    if (!selectedBudgetInfo || !form.material_id) return;
    
    if (form.quantity > selectedBudgetInfo.remaining) {
      alert('Kuantitas melebihi sisa anggaran RAB!');
      return;
    }

    const existing = prItems.find(i => i.material_id === form.material_id);
    if (existing) {
      alert('Material ini sudah ada dalam daftar.');
      return;
    }

    setPrItems([...prItems, {
      material_id: form.material_id,
      quantity: form.quantity,
      name: selectedBudgetInfo.name,
      unit: selectedBudgetInfo.unit
    }]);

    setForm({ ...form, material_id: '', quantity: 1 });
  };

  const handleRemoveItem = (idx: number) => {
    setPrItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRab || prItems.length === 0) return;

    setSubmitting(true);
    try {
      const data = {
        rab_project_id: selectedRab.id,
        project_id: selectedRab.project_id,
        unit_id: selectedRab.unit_id,
        material_id: prItems[0].material_id, // Main material
        items: prItems.map(i => ({ material_id: i.material_id, quantity: i.quantity, name: i.name, unit: i.unit })),
        item_name: description || `${prItems.length} Item Material`,
        status: editingPRId ? undefined : 'PENDING' // Keep status if editing, or set to PENDING for new
      };

      if (editingPRId) {
        await api.update('purchase_requests', editingPRId, data);
        alert('PR Berhasil Diperbarui!');
      } else {
        await api.insert('purchase_requests', data);
        alert('PR Berhasil Diajukan!');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchInitialData();
    } catch (err: any) {
      console.error('Error submitting PR:', err);
      alert(`Gagal menyimpan PR: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRab(null);
    setEditingPRId(null);
    setForm({
      material_id: '',
      quantity: 1,
    });
    setPrItems([]);
    setDescription('');
    setSelectedBudgetInfo(null);
  };

  const [detailPR, setDetailPR] = useState<any | null>(null);

  const handleEditPR = (req: any) => {
    setEditingPRId(req.id);
    
    // Find matching RAB (primary by rab_project_id)
    const rab = rabs.find(r => r.id === req.rab_project_id) || 
                rabs.find(r => r.project_id === req.project_id && r.unit_id === req.unit_id);
    setSelectedRab(rab || null);
    
    setDescription(req.item_name || '');
    
    // Map items from PR back to prItems format
    const mappedItems = (req.items || []).map((item: any) => ({
      material_id: item.material_id,
      quantity: item.quantity || item.qty,
      name: item.materialName || item.name || 'Material',
      unit: item.unit || '-'
    }));
    
    setPrItems(mappedItems);
    setIsModalOpen(true);
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
    const data = (req.items || []).map((item: any, idx: number) => ({
      'No PR': idx === 0 ? `PR-${req.id.slice(0, 8).toUpperCase()}` : '',
      'Tanggal': idx === 0 ? formatDate(req.created_at) : '',
      'Proyek': idx === 0 ? (req.project?.name || '-') : '',
      'Unit': idx === 0 ? (req.unit?.unit_number || '-') : '',
      'Material': item.materialName || item.name || '-',
      'Qty': item.quantity || item.qty || 0,
      'Satuan': item.unit || '-',
      'Keterangan': idx === 0 ? (req.item_name || '-') : '',
      'Status': idx === 0 ? req.status : '',
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 30 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Request');
    XLSX.writeFile(wb, `PR-${req.id.slice(0, 8).toUpperCase()}.xlsx`);
  };

  const handlePrintPR = (e: React.MouseEvent, req: any) => {
    e.stopPropagation();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PR-${req.id.slice(0,8).toUpperCase()}</title>
    <style>
      body{font-family:'Inter', sans-serif;font-size:11px;padding:40px;color:#334155;line-height:1.5}
      @media print{@page{size:A4;margin:15mm}body{padding:0}}
      h2{font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;margin:0 0 4px;color:#0f172a}
      .sub{color:#64748b;font-size:12px;margin-bottom:30px;font-weight:500}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px}
      .info-box{padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9}
      .label{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
      .value{font-size:13px;font-weight:700;color:#1e293b}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#0f172a;color:white;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px}
      td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:500}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:900;text-transform:uppercase;
             border:1px solid #e2e8f0;background:#f8fafc;color:#475569}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h2>Purchase Request</h2>
        <div class="sub">#PR-${req.id.slice(0,8).toUpperCase()} &nbsp;•&nbsp; ${formatDate(req.created_at)}</div>
      </div>
      <div class="badge">${req.status}</div>
    </div>
    
    <div class="info-grid">
      <div class="info-box">
        <div class="label">Proyek</div>
        <div class="value">${req.project?.name||'-'}</div>
      </div>
      <div class="info-box">
        <div class="label">Unit</div>
        <div class="value">${req.unit?.unit_number||'Seluruh Proyek'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:50px">No</th>
          <th>Material / Deskripsi</th>
          <th style="text-align:right">Kuantitas</th>
          <th style="text-align:right">Satuan</th>
        </tr>
      </thead>
      <tbody>
        ${(req.items || []).map((item: any, i: number) => `
          <tr>
            <td>${i+1}</td>
            <td><strong>${item.materialName || item.name || 'Material'}</strong></td>
            <td style="text-align:right"><strong>${item.quantity || item.qty || 0}</strong></td>
            <td style="text-align:right">${item.unit || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div style="margin-top:30px;padding:12px;background:#f1f5f9;border-radius:8px">
      <div class="label">Keterangan / Alasan</div>
      <div class="value" style="font-weight:500">${req.item_name||'-'}</div>
    </div>

    <div style="margin-top:60px;display:flex;justify-content:flex-end">
      <div style="text-align:center">
        <div style="margin-bottom:60px;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase">Diajukan Oleh,</div>
        <div style="border-top:2px solid #0f172a;padding-top:8px;font-size:12px;font-weight:800;min-width:200px">Operational Team</div>
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
          PR Baru (Multi-Item)
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-premium bg-white">
        <Table>
          <THead>
            <TR isHoverable={false}>
              <TH>No. PR / Tgl</TH>
              <TH>Proyek & Pekerjaan</TH>
              <TH>Unit</TH>
              <TH>Item Summary</TH>
              <TH className="text-right">Total Items</TH>
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
                    <div className="font-black text-text-primary uppercase tracking-tight text-sm">{req.rab_title || req.project?.name || '-'}</div>
                    <div className="text-[10px] text-text-muted font-bold">{req.project?.name || '-'}</div>
                  </TD>
                  <TD>
                    <div className="text-xs font-black text-text-secondary">Unit: {req.unit?.unit_number || 'Seluruh'}</div>
                  </TD>
                  <TD>
                    <div className="font-bold text-text-primary text-sm truncate max-w-[200px]">{req.item_name}</div>
                    <div className="text-[10px] text-text-muted font-medium italic">
                      {req.items?.[0]?.name || req.master?.name || 'Material'} {req.items?.length > 1 ? `+${req.items.length - 1} lainnya` : ''}
                    </div>
                  </TD>
                  <TD className="text-right font-black text-text-primary">
                    {req.items?.length || 1} Item
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
                        onClick={(e) => { e.stopPropagation(); handleEditPR(req); }}>
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
        <Modal isOpen={!!detailPR} onClose={() => setDetailPR(null)} title="Detail Purchase Request" size="lg">
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['No. PR', `PR-${detailPR.id.slice(0,8).toUpperCase()}`],
                ['Tanggal', formatDate(detailPR.created_at)],
                ['Proyek', detailPR.project?.name || '-'],
                ['Unit', detailPR.unit?.unit_number || 'Seluruh'],
              ].map(([label, value]) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-xs font-bold text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-hidden">
               <Table>
                 <THead>
                   <TR className="bg-slate-50">
                     <TH className="text-[10px]">Material</TH>
                     <TH className="text-right text-[10px]">Qty</TH>
                   </TR>
                 </THead>
                 <TBody>
                   {(detailPR.items || []).map((item: any, i: number) => (
                     <TR key={i}>
                       <TD className="text-sm font-bold text-slate-700">{item.materialName || item.name || 'Material'}</TD>
                       <TD className="text-right font-black text-slate-700">{item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span></TD>
                     </TR>
                   ))}
                 </TBody>
               </Table>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Keterangan</p>
              <p className="text-sm font-medium text-slate-700">{detailPR.item_name || '-'}</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                detailPR.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                detailPR.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>{detailPR.status}</span>
            </div>
          </div>
        </Modal>
      )}


      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingPRId ? "Edit Purchase Request" : "Buat Purchase Request (Budget Controlled)"}
        size="5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8 px-2 pb-2">
          {/* Step 1: Pilih RAB */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">1</span>
              Pilih Referensi RAB Proyek
            </label>
            <div className="relative group">
              <select 
                className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 text-sm font-bold focus:outline-none focus:border-accent-lavender focus:bg-white transition-all appearance-none cursor-pointer"
                value={selectedRab?.id || ''}
                onChange={(e) => {
                  const rab = rabs.find(r => r.id === e.target.value);
                  setSelectedRab(rab || null);
                  setForm({ ...form, material_id: '' });
                  setPrItems([]);
                }}
                required
              >
                <option value="">-- Pilih RAB Proyek & Unit --</option>
                {rabs.map(r => {
                  const unitLabel = r.unit_id ? ` - Unit ${unitMap[r.unit_id]?.unit_number || r.unit_id}` : '';
                  return (
                    <option key={r.id} value={r.id}>
                      {r.nama_proyek}{unitLabel} - {r.keterangan || 'Tanpa Judul'}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                 <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

          {selectedRab && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gradient-to-br from-slate-50 to-white rounded-[24px] border-2 border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-accent-dark">
                   <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyek Terpilih</p>
                  <p className="text-base font-black text-slate-800 tracking-tight">{selectedRab.nama_proyek}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-accent-dark">
                   <Home className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Proyek</p>
                  <p className="text-base font-black text-slate-800 tracking-tight">{selectedRab.unit_id ? (unitMap[selectedRab.unit_id]?.unit_number || selectedRab.unit_id) : 'Seluruh Proyek'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 & 3: Unified Item Table */}
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">2</span>
              Rincian Material PR
            </label>
            <div className="rounded-[28px] border-2 border-slate-100 overflow-hidden bg-white shadow-premium-subtle">
              <Table className="w-full">
                <THead>
                  <TR className="bg-slate-50/80 border-b border-slate-100">
                    <TH className="text-[11px] py-4 pl-6 uppercase tracking-wider text-slate-500 min-w-[600px]">Material</TH>
                    <TH className="text-right text-[11px] py-4 uppercase tracking-wider text-slate-500 w-40">Kuantitas</TH>
                    <TH className="w-20 py-4 pr-6"></TH>
                  </TR>
                </THead>
                <TBody>
                  {/* List of Added Items */}
                  {prItems.map((item, i) => (
                    <TR key={i} className="border-b border-slate-50 group hover:bg-slate-50/50 transition-colors">
                      <TD className="py-5 pl-6">
                        <div className="font-black text-slate-800 text-base mb-1">{item.name}</div>
                        <div className="flex items-center gap-2">
                           <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase">Budgeted</span>
                           <span className="text-[10px] font-bold text-slate-400">RAB Reference Active</span>
                        </div>
                      </TD>
                      <TD className="text-right py-5 w-40">
                        <div className="font-black text-slate-800 text-lg">{formatNumber(item.quantity)} <span className="text-xs text-slate-400 font-bold uppercase ml-1">{item.unit}</span></div>
                      </TD>
                      <TD className="py-5 pr-6 text-right w-20">
                        <button type="button" onClick={() => handleRemoveItem(i)} className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </TD>
                    </TR>
                  ))}

                  {/* Form Row for Adding New Item */}
                  <TR className="bg-slate-50/40">
                    <TD className="py-6 pl-6">
                      <div className="space-y-3">
                        <select 
                          className="w-full h-14 bg-white border-2 border-slate-200 rounded-2xl px-5 text-sm font-black text-slate-700 focus:outline-none focus:border-accent-lavender shadow-sm transition-all disabled:opacity-50"
                          value={form.material_id}
                          onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                          disabled={!selectedRab || loadingBudget}
                        >
                          <option value="">{loadingBudget ? 'Menghitung sisa...' : '-- Pilih Material --'}</option>
                          {budgetItems.map(m => (
                            <option key={m.material_id} value={m.material_id} disabled={m.quota <= m.used || prItems.some(i => i.material_id === m.material_id)}>
                              {m.name} {m.quota <= m.used ? '(Budget Habis)' : `(Sisa: ${formatNumber(m.quota - m.used)} ${m.unit})`}
                            </option>
                          ))}
                        </select>
                        
                        {selectedBudgetInfo && (
                          <div className="flex items-center gap-4 px-1 animate-in slide-in-from-left-2 duration-300">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sisa Anggaran</span>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-black text-emerald-600">{formatNumber(selectedBudgetInfo.remaining)} {selectedBudgetInfo.unit}</span>
                              </div>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Kuota</span>
                              <span className="text-xs font-bold text-slate-500">{formatNumber(selectedBudgetInfo.quota)} {selectedBudgetInfo.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TD>
                    <TD className="text-right py-6 w-40">
                      <div className="flex flex-col items-end gap-3">
                        <div className="relative">
                          <Input 
                            type="number"
                            className={`h-14 w-32 rounded-2xl px-5 text-right font-black text-xl border-2 transition-all shadow-sm ${isExceeding ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-800'}`}
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                            min="0.1"
                            step="0.1"
                            disabled={!form.material_id}
                          />
                          {selectedBudgetInfo && (
                            <div className="absolute -top-6 right-1">
                               <span className="text-[10px] font-black text-slate-400 uppercase">{selectedBudgetInfo.unit}</span>
                            </div>
                          )}
                        </div>
                        {isExceeding && (
                          <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter animate-bounce">Exceeds Budget!</span>
                        )}
                      </div>
                    </TD>
                    <TD className="py-6 pr-6 text-right w-20">
                      <Button 
                        type="button"
                        className="h-14 w-14 p-0 rounded-2xl bg-accent-dark hover:bg-slate-800 text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-30 disabled:scale-100"
                        onClick={handleAddItem}
                        disabled={!form.material_id || form.quantity <= 0 || isExceeding}
                      >
                        <Plus className="w-7 h-7" />
                      </Button>
                    </TD>
                  </TR>
                </TBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">3</span>
              Keterangan Tambahan
            </label>
            <textarea 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] text-sm font-medium focus:outline-none focus:border-accent-lavender focus:bg-white transition-all shadow-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Berikan alasan atau detail tambahan untuk pengajuan ini..."
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Button 
              type="button" 
              variant="ghost" 
              className="h-14 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-100" 
              onClick={() => { setIsModalOpen(false); resetForm(); }}
            >
              Batalkan
            </Button>
            <Button 
              type="submit" 
              className="h-14 rounded-2xl px-12 font-black text-sm uppercase tracking-widest shadow-premium bg-accent-dark hover:bg-slate-800 text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" 
              isLoading={submitting}
              disabled={prItems.length === 0}
            >
              Simpan {prItems.length > 0 ? `${prItems.length} Item ` : ''}PR
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
