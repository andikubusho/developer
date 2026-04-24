import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, ArrowLeft, Clock, CheckCircle2, XCircle, Package, Building2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Project, Material } from '../types';

const PurchaseRequests: React.FC = () => {
  const { setDivision, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    project_id: '',
    material_id: '',
    quantity: 1,
    description: ''
  });

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [reqData, projData, matData] = await Promise.all([
        api.get('purchase_requests', 'select=*,project:projects(name),material:materials(name,unit,unit_price)&order=created_at.desc'),
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.material_id) {
      alert('Mohon pilih proyek dan material');
      return;
    }

    try {
      setSubmitting(true);
      const selectedMaterial = materials.find(m => m.id === form.material_id);
      const estimatedCost = (selectedMaterial as any)?.unit_price * form.quantity || 0;

      await api.insert('purchase_requests', {
        project_id: form.project_id,
        material_id: form.material_id,
        quantity: form.quantity,
        description: form.description,
        estimated_cost: estimatedCost,
        requested_by: profile?.full_name || 'System',
        status: 'pending',
        request_date: new Date().toISOString()
      });

      setIsModalOpen(false);
      setForm({ project_id: '', material_id: '', quantity: 1, description: '' });
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
            <p className="text-slate-500 font-medium">Permintaan pembelian material dan jasa</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl h-12 px-8 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5 mr-2" /> Buat Request Baru
        </Button>
      </div>

      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5 font-black">No. Request</th>
                <th className="px-8 py-5 font-black">Proyek & Material</th>
                <th className="px-8 py-5 font-black text-right">Qty</th>
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
                        <span className="text-xs font-black text-slate-900">{r.material?.name || 'Material'}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">{r.project?.name || 'Proyek Umum'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-black text-slate-900 text-right">
                      {r.quantity} <span className="text-[9px] text-slate-400 font-bold uppercase">{r.material?.unit}</span>
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

      {/* New Request Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Buat Purchase Request Baru"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Pilih Proyek
              </label>
              <select 
                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                required
              >
                <option value="">Pilih Proyek...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <Package className="w-3 h-3" /> Pilih Material
              </label>
              <select 
                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={form.material_id}
                onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                required
              >
                <option value="">Pilih Material...</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Jumlah (Quantity)"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Estimasi Biaya</span>
               <span className="text-xl font-black text-indigo-600 mt-1">
                  {formatCurrency((materials.find(m => m.id === form.material_id) as any)?.unit_price * form.quantity || 0)}
               </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Keterangan / Keperluan</label>
            <textarea 
              className="w-full h-32 bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              placeholder="Jelaskan detail permintaan Anda..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20" isLoading={submitting}>
              Ajukan Permintaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequests;
