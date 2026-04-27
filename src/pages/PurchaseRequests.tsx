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
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [projData, matData, reqData] = await Promise.all([
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('materials', 'select=id,name,unit,unit_price&order=name.asc'),
        api.get('purchase_requests', 'select=*,project:projects(name),unit:units(unit_number)&order=created_at.desc')
      ]);

      console.log('📦 Purchase Requests Response:', reqData);
      setProjects(projData);
      setMaterials(matData);
      setRequests(reqData);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

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
  }, [form.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.insert('purchase_requests', {
        project_id: form.project_id,
        unit_id: form.unit_id,
        description: form.description,
        status: 'PENDING',
        items: form.items
      });
      setIsModalOpen(false);
      fetchInitialData();
      setForm({
        project_id: '',
        unit_id: '',
        description: '',
        items: [{ material_id: '', quantity: 1 }]
      });
    } catch (err) {
      console.error('Error submitting PR:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Purchase Requests</h1>
            <p className="text-text-secondary">Permintaan pembelian material</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          PR Baru
        </Button>
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>No. PR / Tgl</TH>
              <TH>Proyek & Unit</TH>
              <TH>Deskripsi</TH>
              <TH>Status</TH>
              <TH className="text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR>
                <TD colSpan={5} className="text-center py-8">
                  <RefreshCw className="animate-spin mx-auto" />
                </TD>
              </TR>
            ) : requests.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center py-8 text-text-secondary">Tidak ada data permintaan.</TD>
              </TR>
            ) : (
              requests.map((req) => (
                <TR key={req.id}>
                  <TD>
                    <div className="font-bold">PR-{req.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-text-secondary">{formatDate(req.created_at)}</div>
                  </TD>
                  <TD>
                    <div className="font-medium">{req.project?.name || '-'}</div>
                    <div className="text-xs text-text-secondary">Unit: {req.unit?.unit_number || '-'}</div>
                  </TD>
                  <TD className="text-sm">{req.description || '-'}</TD>
                  <TD>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="sm">Detail</Button>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Proyek</label>
              <select 
                className="w-full p-2 border rounded-xl"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                required
              >
                <option value="">Pilih Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Unit</label>
              <select 
                className="w-full p-2 border rounded-xl"
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
            <label className="text-sm font-bold">Deskripsi / Alasan</label>
            <textarea 
              className="w-full p-2 border rounded-xl"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold">Item Material</label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setForm({ ...form, items: [...form.items, { material_id: '', quantity: 1 }] })}
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Tambah Item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <select 
                      className="w-full p-2 border rounded-xl text-sm"
                      value={item.material_id}
                      onChange={(e) => {
                        const newItems = [...form.items];
                        newItems[idx].material_id = e.target.value;
                        setForm({ ...form, items: newItems });
                      }}
                      required
                    >
                      <option value="">Pilih Material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="w-24 space-y-1">
                    <input 
                      type="number"
                      className="w-full p-2 border rounded-xl text-sm"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...form.items];
                        newItems[idx].quantity = parseInt(e.target.value);
                        setForm({ ...form, items: newItems });
                      }}
                      min="1"
                      required
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-rose-500"
                    onClick={() => {
                      const newItems = form.items.filter((_, i) => i !== idx);
                      setForm({ ...form, items: newItems });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan PR'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseRequests;
