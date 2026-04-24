import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Package, 
  Building2, 
  Home, 
  Trash2, 
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Project, Material } from '../types';

interface PRItem {
  material_id: string;
  quantity: number;
}

const PurchaseRequests: React.FC = () => {
  const { setDivision, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    project_id: '',
    unit_id: '',
    description: '',
    items: [{ material_id: '', quantity: 1 }] as PRItem[]
  });

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [reqData, projData, matData] = await Promise.all([
        api.get('purchase_requests', 'select=*,project:projects(name),unit:units(name),material:materials(name,unit,unit_price)&order=created_at.desc'),
        api.get('projects', 'select=id,name&active=eq.true'),
        api.get('materials', 'select=id,name,unit,unit_price')
      ]);
      setRequests(reqData || []);
      setProjects(projData || []);
      setMaterials(matData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitsForProject = async (projectId: string) => {
    if (!projectId) {
      setUnits([]);
      return;
    }
    try {
      const unitData = await api.get('units', `select=id,name&project_id=eq.${projectId}`);
      setUnits(unitData || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchUnitsForProject(form.project_id);
  }, [form.project_id]);

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { material_id: '', quantity: 1 }]
    });
  };

  const removeItemRow = (index: number) => {
    if (form.items.length <= 1) return;
    const newItems = [...form.items];
    newItems.splice(index, 1);
    setForm({ ...form, items: newItems });
  };

  const updateItem = (index: number, field: keyof PRItem, value: any) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const calculateTotal = () => {
    return form.items.reduce((sum, item) => {
      const mat = materials.find(m => m.id === item.material_id);
      return sum + ((mat as any)?.unit_price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) {
      alert('Mohon pilih proyek');
      return;
    }
    if (form.items.some(i => !i.material_id)) {
      alert('Mohon pilih material untuk semua baris');
      return;
    }

    try {
      setSubmitting(true);
      const estimatedCost = calculateTotal();

      // For legacy/single-item compatibility we store the first material in the old columns
      // and the full list in the 'items' JSON column
      await api.insert('purchase_requests', {
        project_id: form.project_id,
        unit_id: form.unit_id || null,
        material_id: form.items[0].material_id, // first item for single-view
        quantity: form.items[0].quantity,
        items: form.items, // JSON array
        description: form.description,
        estimated_cost: estimatedCost,
        requested_by: profile?.full_name || 'System',
        status: 'pending',
        request_date: new Date().toISOString()
      });

      setIsModalOpen(false);
      setForm({ project_id: '', unit_id: '', description: '', items: [{ material_id: '', quantity: 1 }] });
      fetchInitialData();
      alert('Purchase Request berhasil diajukan!');
    } catch (error: any) {
      console.error('Error saving PR:', error);
      alert(`Gagal mengajukan PR: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-3 h-auto rounded-2xl bg-white shadow-sm border border-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Purchase Request</h1>
            <p className="text-slate-500 font-medium">Pengajuan pengadaan material per unit proyek</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl h-12 px-8 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5 mr-2" /> Buat Request Baru
        </Button>
      </div>

      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5 font-black">No. Request</th>
                <th className="px-8 py-5 font-black">Proyek & Unit</th>
                <th className="px-8 py-5 font-black">Item Material</th>
                <th className="px-8 py-5 font-black text-right">Estimasi Biaya</th>
                <th className="px-8 py-5 font-black text-center">Status</th>
                <th className="px-8 py-5 font-black">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400">Memuat data...</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Belum ada data permintaan.</p>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 font-black text-slate-900 uppercase text-xs">PR-{r.id.substring(0, 8)}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{r.project?.name || 'Proyek Umum'}</span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight mt-1 flex items-center gap-1">
                          <Home className="w-3 h-3" /> {r.unit?.name || 'Gudang Utama'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {r.items && Array.isArray(r.items) ? (
                        <div className="flex flex-col gap-1">
                           <span className="text-xs font-bold text-slate-700">{r.items.length} Macam Material</span>
                           <span className="text-[9px] text-slate-400 truncate max-w-[200px]">
                              {r.items.map((i: any) => {
                                const m = materials.find(mat => mat.id === i.material_id);
                                return m ? `${m.name} (${i.quantity} ${m.unit})` : '';
                              }).join(', ')}
                           </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-700">{r.material?.name || 'Material'} ({r.quantity})</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-indigo-600 text-right">{formatCurrency(r.estimated_cost)}</td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center items-center gap-2">
                        <span className={cn(
                          'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
                          r.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          r.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          'bg-amber-50 text-amber-600 border-amber-100'
                        )}>
                          {r.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-500">{formatDate(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Advanced Request Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Buat Purchase Request Baru"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <Building2 className="w-3 h-3 text-indigo-500" /> Pilih Daftar Proyek
              </label>
              <select 
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value, unit_id: '' })}
                required
              >
                <option value="">Pilih Proyek dari Daftar Proyek...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <Home className="w-3 h-3 text-indigo-500" /> Pilih Unit Properti (Opsional)
              </label>
              <select 
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm disabled:opacity-50"
                value={form.unit_id}
                onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                disabled={!form.project_id}
              >
                <option value="">Pilih Unit dari Unit Properti...</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic Item List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Daftar Material
               </h3>
               <Button type="button" variant="ghost" size="sm" onClick={addItemRow} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50">
                  <PlusCircle className="w-4 h-4 mr-1" /> Tambah Baris
               </Button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => {
                const selectedMat = materials.find(m => m.id === item.material_id);
                return (
                  <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</label>
                      <select 
                        className="w-full h-11 bg-slate-50 border-none rounded-xl px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none"
                        value={item.material_id}
                        onChange={(e) => updateItem(index, 'material_id', e.target.value)}
                        required
                      >
                        <option value="">Pilih Material...</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.specification ? `(${m.specification})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</label>
                      <Input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="h-11 text-xs"
                      />
                    </div>

                    <div className="w-32 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</label>
                      <div className="h-11 flex items-center px-3 bg-slate-50 rounded-xl text-[11px] font-black text-indigo-600">
                        {formatCurrency(((selectedMat as any)?.unit_price || 0) * item.quantity)}
                      </div>
                    </div>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => removeItemRow(index)}
                      className="h-11 w-11 p-0 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                      disabled={form.items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Keterangan / Keperluan</label>
              <textarea 
                className="w-full h-20 bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                placeholder="Catatan tambahan..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            
            <div className="w-full md:w-64 p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Estimasi</span>
               <div className="text-2xl font-black mt-1 text-emerald-400">
                  {formatCurrency(calculateTotal())}
               </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl shadow-lg shadow-indigo-200" isLoading={submitting}>
              Ajukan Permintaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequests;
