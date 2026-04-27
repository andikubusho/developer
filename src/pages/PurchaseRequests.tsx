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
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Project, Material } from '../types';

interface PRItem {
  material_id: string;
  quantity: number;
}

interface MaterialWithPrice extends Material {
  unit_price?: number;
}

const PurchaseRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<MaterialWithPrice[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
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
    setLoading(true);
    try {
      const [projData, matData, reqData] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc').catch(() => []),
        api.get('materials', 'select=id,name,unit,unit_price&order=name.asc').catch(() => []),
        api.get(
          'purchase_requests',
          'select=*,project:projects(name),unit:property_units(unit_number)&order=created_at.desc'
        ).catch(() => []),
      ]);
      setProjects(projData || []);
      setMaterials(matData || []);
      setRequests(reqData || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitsForProject = async (projectId: string) => {
    if (!projectId) { setUnits([]); return; }
    try {
      const unitData = await api.get('units', `select=id,unit_number&project_id=eq.${projectId}`);
      setUnits(unitData || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { fetchUnitsForProject(form.project_id); }, [form.project_id]);

  const addItemRow = () => {
    setForm({ ...form, items: [...form.items, { material_id: '', quantity: 1 }] });
  };

  const removeItemRow = (index: number) => {
    if (form.items.length <= 1) return;
    const newItems = [...form.items];
    newItems.splice(index, 1);
    setForm({ ...form, items: newItems });
  };

  const updateItem = (index: number, field: keyof PRItem, value: string | number) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const calculateTotal = () => {
    return form.items.reduce((sum: number, item: PRItem) => {
      const mat = materials.find((m: MaterialWithPrice) => m.id === item.material_id);
      return sum + (mat?.unit_price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) { alert('Mohon pilih proyek'); return; }
    if (form.items.some((i: PRItem) => !i.material_id)) {
      alert('Mohon pilih material untuk semua baris');
      return;
    }

    try {
      setSubmitting(true);
      const itemsWithData = form.items.map((item: PRItem) => {
        const mat = materials.find((m: MaterialWithPrice) => m.id === item.material_id);
        return {
          materialId: item.material_id,
          name: mat?.name,
          unit: mat?.unit,
          qty: item.quantity,
          price: mat?.unit_price || 0,
        };
      });

      await api.insert('purchase_requests', {
        project_id: form.project_id,
        unit_id: form.unit_id || null,
        item_name: form.description || `PR Material - ${new Date().toLocaleDateString()}`,
        items: itemsWithData,
        status: 'SUBMITTED',
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-3 h-auto rounded-xl bg-white shadow-glass border border-white/40">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Purchase Request</h1>
            <p className="text-text-secondary font-medium">Pengajuan pengadaan material per unit proyek</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-xl h-12 px-8 shadow-glass">
          <Plus className="w-5 h-5 mr-2" /> Buat Request Baru
        </Button>
      </div>

      <Card className="p-0 border-none shadow-premium bg-white overflow-hidden">
        <Table>
          <THead>
            <TR className="bg-white/20 text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">
              <TH className="px-10 py-7 font-black">No. Request</TH>
              <TH className="px-10 py-7 font-black">Proyek & Unit</TH>
              <TH className="px-10 py-7 font-black">Item Material</TH>
              <TH className="px-10 py-7 font-black text-right">Estimasi Biaya</TH>
              <TH className="px-10 py-7 font-black text-center">Status</TH>
              <TH className="px-10 py-7 font-black">Tanggal</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={6} className="px-10 py-24 text-center text-text-muted">Memuat data...</TD></TR>
            ) : requests.length === 0 ? (
              <TR>
                <TD colSpan={6} className="px-10 py-24 text-center">
                  <ClipboardList className="w-16 h-16 text-white mx-auto mb-6" />
                  <p className="text-text-muted font-bold uppercase text-xs tracking-widest">Belum ada data permintaan.</p>
                </TD>
              </TR>
            ) : (
              requests.map((r: any) => (
                <TR key={r.id} className="hover:bg-white/20 transition-colors group">
                  <TD className="px-10 py-8 font-black text-text-primary uppercase text-xs">PR-{r.id.substring(0, 8)}</TD>
                  <TD className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-text-primary">{r.project?.name || 'Proyek Umum'}</span>
                      <span className="text-xs font-bold text-accent-dark uppercase tracking-tight mt-1 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" /> {r.unit?.unit_number || 'Gudang Utama'}
                      </span>
                    </div>
                  </TD>
                  <TD className="px-10 py-8">
                    {r.items && Array.isArray(r.items) ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-text-primary">{r.items.length} Macam Material</span>
                        <span className="text-[11px] text-text-muted truncate max-w-[250px]">
                          {r.items.map((i: any) => {
                            const m = materials.find((mat: MaterialWithPrice) => mat.id === i.material_id);
                            return m ? `${m.name} (${i.quantity} ${m.unit})` : '';
                          }).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-text-primary">{r.material?.name || 'Material'} ({r.quantity})</span>
                    )}
                  </TD>
                  <TD className="px-10 py-8 text-base font-black text-accent-dark text-right">{formatCurrency(r.estimated_cost)}</TD>
                  <TD className="px-10 py-8 text-center">
                    <span className={cn(
                      'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border',
                      r.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      r.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    )}>
                      {r.status}
                    </span>
                  </TD>
                  <TD className="px-10 py-8 text-sm font-bold text-text-secondary">{formatDate(r.created_at)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Purchase Request Baru"
        size="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/30 p-8 rounded-[2rem] border border-white/40">
            <div className="space-y-2.5">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block flex items-center gap-2 ml-1">
                <Building2 className="w-4 h-4 text-accent-dark" /> Pilih Daftar Proyek
              </label>
              <select
                className="w-full h-14 glass-input rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none transition-all shadow-glass"
                value={form.project_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, project_id: e.target.value, unit_id: '' })}
                required
              >
                <option value="">Pilih Proyek dari Daftar Proyek...</option>
                {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] block flex items-center gap-2 ml-1">
                <Home className="w-4 h-4 text-accent-dark" /> Pilih Unit Properti (Opsional)
              </label>
              <select
                className="w-full h-14 glass-input rounded-xl px-6 text-base font-bold text-text-primary focus:outline-none transition-all shadow-glass disabled:opacity-50"
                value={form.unit_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, unit_id: e.target.value })}
                disabled={!form.project_id}
              >
                <option value="">Pilih Unit dari Unit Properti...</option>
                {units.map((u: { id: string; unit_number: string }) => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4 text-accent-dark" /> Daftar Material
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={addItemRow} className="text-accent-dark font-black text-[10px] uppercase tracking-widest hover:bg-accent-lavender/20">
                <PlusCircle className="w-4 h-4 mr-1" /> Tambah Baris
              </Button>
            </div>

            <div className="space-y-3">
              {form.items.map((item: PRItem, index: number) => {
                const selectedMat = materials.find((m: MaterialWithPrice) => m.id === item.material_id);
                return (
                  <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-4 p-4 glass-card rounded-xl border border-white/40 shadow-glass group">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Material</label>
                      <select
                        className="w-full h-11 glass-input border-none rounded-xl px-3 text-xs font-bold text-text-primary focus:outline-none"
                        value={item.material_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateItem(index, 'material_id', e.target.value)}
                        required
                      >
                        <option value="">Pilih Material...</option>
                        {materials.map((m: MaterialWithPrice) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.specification ? `(${m.specification})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Qty</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="h-11 text-xs"
                      />
                    </div>

                    <div className="w-32 space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Subtotal</label>
                      <div className="h-11 flex items-center px-3 bg-white/30 rounded-xl text-[11px] font-black text-accent-dark">
                        {formatCurrency((selectedMat?.unit_price || 0) * item.quantity)}
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

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/40">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest block">Keterangan / Keperluan</label>
              <textarea
                className="w-full h-20 glass-input border-none rounded-xl p-4 text-sm font-medium text-text-primary focus:outline-none transition-all resize-none"
                placeholder="Catatan tambahan..."
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="w-full md:w-64 p-6 bg-accent-dark rounded-xl text-white shadow-glass">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Total Estimasi</span>
              <div className="text-2xl font-black mt-1 text-emerald-400">
                {formatCurrency(calculateTotal())}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl shadow-glass" isLoading={submitting}>
              Ajukan Permintaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequests;
