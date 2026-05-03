import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Home, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  ArrowLeft,
  Search,
  HardHat,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { Project } from '../types';
import { cn } from '../lib/utils';

interface RABNode {
  id: string;
  parent_id: string | null;
  level: number;
  uraian: string;
  worker_id: string | null;
  children: RABNode[];
  isExpanded: boolean;
}

const WorkerAssignment: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [unitRabs, setUnitRabs] = useState<any[]>([]);
  const [globalRabs, setGlobalRabs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState(''); // value: RAB_${id}
  const [tree, setTree] = useState<RABNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadUnits();
      if (selectedUnitId) {
        loadRABTree();
      } else {
        setTree([]);
      }
    }
  }, [selectedProjectId, selectedUnitId]);

  const fetchProjects = async () => {
    const data = await api.get('projects', 'select=id,name&order=name.asc');
    setProjects(data || []);
  };

  const fetchWorkers = async () => {
    const data = await api.get('worker_masters', 'status=eq.active&order=name.asc');
    setWorkers(data || []);
  };

  const loadUnits = async () => {
    const [unitsData, rabsWithUnit, gRabs] = await Promise.all([
      api.get('units', `project_id=eq.${selectedProjectId}&select=id,unit_number,type&order=unit_number.asc`),
      api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=not.is.null&select=id,nama_proyek,keterangan,unit_id&order=unit_id.asc`),
      api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=is.null&order=nama_proyek.asc`)
    ]);
    const unitMap: Record<string, any> = {};
    (unitsData || []).forEach((u: any) => { unitMap[u.id] = u; });
    setUnitRabs((rabsWithUnit || []).map((r: any) => ({ ...r, unit: unitMap[r.unit_id] || null })));
    setGlobalRabs(gRabs || []);
  };

  const loadRABTree = async () => {
    try {
      setLoading(true);
      const rabId = selectedUnitId.replace('RAB_', '');
      const rabData = await api.get('rab_projects', `id=eq.${rabId}`);

      if (!rabData || rabData.length === 0) {
        setTree([]);
        setLoading(false);
        return;
      }

      const rabProjectId = rabData[0].id;
      const items = await api.get('rab_items', `rab_project_id=eq.${rabProjectId}&order=urutan.asc`);

      const buildTree = (parentId: string | null): RABNode[] => {
        return (items || [])
          .filter((item: any) => item.parent_id === parentId)
          .map((item: any) => ({
            id: item.id,
            parent_id: item.parent_id,
            level: item.level,
            uraian: item.uraian,
            worker_id: item.worker_id,
            children: buildTree(item.id),
            isExpanded: true
          }));
      };

      setTree(buildTree(null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateNode = (nodes: RABNode[], id: string, updates: Partial<RABNode>): RABNode[] => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, ...updates };
      if (node.children.length > 0) return { ...node, children: updateNode(node.children, id, updates) };
      return node;
    });
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const flatItems: { id: string, worker_id: string | null }[] = [];
      const traverse = (nodes: RABNode[]) => {
        nodes.forEach(node => {
          if (node.level === 2) { // Only save for work items
            flatItems.push({ id: node.id, worker_id: node.worker_id });
          }
          if (node.children.length > 0) traverse(node.children);
        });
      };
      traverse(tree);

      await Promise.all(flatItems.map(item => 
        api.update('rab_items', item.id, { worker_id: item.worker_id })
      ));

      alert('Penugasan Mandor berhasil disimpan!');
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRows = (nodes: RABNode[], depth: number = 0) => {
    return nodes.map(node => {
      const isWorkItem = node.level === 2;
      const matchesSearch = node.uraian.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchesSearch && node.children.every(c => !c.uraian.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return null;
      }

      return (
        <React.Fragment key={node.id}>
          <TR className={cn(
            "hover:bg-white/40 transition-colors border-b border-white/20",
            node.level === 0 ? "bg-accent-dark/5" : node.level === 1 ? "bg-accent-lavender/5" : ""
          )}>
            <TD className="px-6 py-4">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
                {node.children.length > 0 ? (
                  <button onClick={() => setTree(prev => updateNode(prev, node.id, { isExpanded: !node.isExpanded }))}>
                    {node.isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                  </button>
                ) : <div className="w-4" />}
                <span className={cn(
                  "text-sm font-bold",
                  node.level === 0 ? "text-accent-dark uppercase tracking-tight" : "text-text-primary"
                )}>
                  {node.uraian}
                </span>
              </div>
            </TD>
            <TD className="px-6 py-4 w-64">
              {isWorkItem && (
                <select
                  value={node.worker_id || ''}
                  onChange={(e) => setTree(prev => updateNode(prev, node.id, { worker_id: e.target.value || null }))}
                  className="w-full h-10 bg-white/60 border border-white/40 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Pilih Mandor --</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
            </TD>
          </TR>
          {node.isExpanded && renderRows(node.children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="w-14 h-14 rounded-3xl glass-card flex items-center justify-center text-text-muted hover:text-primary transition-all hover:scale-105 shadow-3d">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter italic uppercase">Penugasan Mandor</h1>
            <p className="text-sm font-black text-text-secondary uppercase tracking-[0.3em] mt-1 opacity-60">Assignment Task per RAB Item</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={handleSave} 
            isLoading={submitting}
            className="h-14 px-8 rounded-2xl shadow-premium font-black text-xs uppercase tracking-widest"
          >
            <Save className="w-4 h-4 mr-2" /> Simpan Penugasan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 size={12} /> Pilih Proyek
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedUnitId('');
              }}
              className="w-full h-12 glass-input rounded-xl px-4 font-bold"
            >
              <option value="">-- Pilih Proyek --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </Card>

        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Home size={12} /> Pilih Unit Properti
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={!selectedProjectId}
              className="w-full h-12 glass-input rounded-xl px-4 font-bold disabled:opacity-50"
            >
              <option value="">-- Pilih Unit / Pekerjaan --</option>
              {globalRabs.length > 0 && (
                <optgroup label="🌐 PEKERJAAN GLOBAL / FASUM">
                  {globalRabs.map((r: any) => (
                    <option key={r.id} value={`RAB_${r.id}`}>
                      {r.nama_proyek}{r.keterangan ? ` - ${r.keterangan}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {unitRabs.length > 0 && (
                <optgroup label="🏠 UNIT PROPERTY">
                  {unitRabs.map((r: any) => (
                    <option key={r.id} value={`RAB_${r.id}`}>
                      {r.unit ? `${r.unit.unit_number} - ${r.unit.type}` : 'Unit'}{r.nama_proyek || r.keterangan ? ` · ${r.nama_proyek || r.keterangan}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden bg-white/40 backdrop-blur-xl border-white/60 shadow-3d">
        <div className="p-6 border-b border-white/40 bg-white/20 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input 
              placeholder="Cari uraian pekerjaan..." 
              className="w-full h-12 glass-input rounded-2xl pl-12 pr-4 font-bold focus:outline-none" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-text-muted uppercase tracking-widest">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-accent-dark/10 rounded" /> Section</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-accent-lavender/10 rounded" /> Kelompok</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR className="bg-slate-100/50 text-[10px] font-black uppercase tracking-widest text-text-muted">
                <TH className="px-6 py-5">Uraian Pekerjaan (RAB)</TH>
                <TH className="px-6 py-5 w-64">Mandor / Subkon Pelaksana</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={2} className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary mx-auto"></div></TD></TR>
              ) : tree.length === 0 ? (
                <TR><TD colSpan={2} className="py-20 text-center text-text-muted italic">Pilih Proyek & Unit untuk melihat daftar pekerjaan.</TD></TR>
              ) : (
                renderRows(tree)
              )}
            </TBody>
          </Table>
        </div>
      </Card>
      
      <div className="p-6 bg-accent-lavender/10 rounded-3xl border border-accent-lavender/20 flex gap-6">
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-3d flex-shrink-0">
          <UserCheck size={28} />
        </div>
        <div>
          <h4 className="font-black text-text-primary uppercase text-sm tracking-widest">Tips Penugasan</h4>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Data penugasan ini akan otomatis terisi saat Mandor melakukan <strong>Opname Lapangan</strong>. 
            Anda tidak perlu lagi memilih mandor satu per satu di setiap laporan opname jika sudah didaftarkan di sini.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkerAssignment;
