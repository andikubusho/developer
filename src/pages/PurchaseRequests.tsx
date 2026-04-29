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
  Info
} from 'lucide-react';
import { Button } from '../components/ui/Button';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [masters, setMasters] = useState<MasterMaterial[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<any[]>([]);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const [form, setForm] = useState({
    project_id: '',
    unit_id: '',
    material_id: '',
    quantity: 1,
    description: ''
  });

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [projData, masterData, reqData, unitData] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('materials', 'select=id,name,unit,code&order=name.asc'),
        api.get('purchase_requests', 'select=*&order=created_at.desc'),
        api.get('units', 'select=id,unit_number'),
      ]);

      const projectMap: Record<string, any> = {};
      (projData || []).forEach((p: any) => { projectMap[p.id] = p; });
      const unitMap: Record<string, any> = {};
      (unitData || []).forEach((u: any) => { unitMap[u.id] = u; });
      const masterMap: Record<string, any> = {};
      (masterData || []).forEach((m: any) => { masterMap[m.id] = m; });

      const enrichedReqs = (reqData || []).map((r: any) => ({
        ...r,
        project: r.project_id ? (projectMap[r.project_id] || null) : null,
        unit: r.unit_id ? (unitMap[r.unit_id] || null) : null,
        master: r.material_id ? (masterMap[r.material_id] || null) : null,
      }));

      setProjects(projData);
      setMasters(masterData);
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

  const fetchUnitsForProject = async (projectId: string) => {
    if (!projectId) {
      setUnits([]);
      return;
    }
    const data = await api.get('units', `project_id=eq.${projectId}&select=id,unit_number&order=unit_number.asc`);
    setUnits(data);
  };

  useEffect(() => {
    fetchUnitsForProject(form.project_id);
    // Budget check logic will need update to use master material mapping in the future
  }, [form.project_id, form.unit_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.insert('purchase_requests', {
        project_id: form.project_id,
        unit_id: form.unit_id,
        material_id: form.material_id,
        items: [{ material_id: form.material_id, quantity: form.quantity }], 
        description: form.description,
        status: 'PENDING'
      });
      setIsModalOpen(false);
      fetchInitialData();
      setForm({
        project_id: '',
        unit_id: '',
        material_id: '',
        quantity: 1,
        description: ''
      });
    } catch (err) {
      console.error('Error submitting PR:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Purchase Requests</h1>
            <p className="text-text-secondary">Permintaan pengadaan Master Material</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-xl h-11 px-6 shadow-premium">
          <Plus className="w-4 h-4 mr-2" />
          PR Baru
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
                    <Button variant="ghost" size="sm" className="rounded-xl">Detail</Button>
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
        title="Buat Permintaan Pembelian (PR)"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Proyek</label>
              <select 
                className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                required
              >
                <option value="">Pilih Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Unit</label>
              <select 
                className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
                value={form.unit_id}
                onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                required
              >
                <option value="">Pilih Unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Pilih Master Material</label>
            <select 
              className="w-full h-12 glass-input rounded-xl px-4 text-sm font-bold focus:outline-none"
              value={form.material_id}
              onChange={(e) => setForm({ ...form, material_id: e.target.value })}
              required
            >
              <option value="">-- Pilih Material --</option>
              {masters.map(m => (
                <option key={m.id} value={m.id}>
                  {m.code ? `[${m.code}] ` : ''}{m.name} ({m.unit})
                </option>
              ))}
            </select>
            <div className="px-2 py-1 bg-blue-50 rounded-lg flex items-center gap-2">
              <Info className="w-3 h-3 text-blue-600" />
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">PR hanya boleh memilih Master Material (Bukan Merk)</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Kuantitas Permintaan</label>
            <div className="relative">
              <Input 
                type="number"
                className="h-12 glass-input rounded-xl px-4 font-black text-lg"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                min="1"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted uppercase tracking-widest">
                {masters.find(m => m.id === form.material_id)?.unit}
              </div>
            </div>
          </div>

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
            <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="h-12 rounded-xl px-8 font-black shadow-premium" isLoading={submitting}>
              Simpan Permintaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequests;

// Adding formatNumber if not imported
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('id-ID').format(num);
};
