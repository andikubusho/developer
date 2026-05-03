import React, { useState, useEffect } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Camera, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Home,
  Save,
  X,
  Clock
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface RABNode {
  id: string;
  parent_id: string | null;
  level: number;
  uraian: string;
  total_price: number;
  weight: number;
  current_progress: number; // Previous reported progress
  new_progress: number;     // Input for this session
  children: RABNode[];
  isExpanded: boolean;
}

const ConstructionProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const [tree, setTree] = useState<RABNode[]>([]);
  
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalDescription, setGeneralDescription] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchProgressHistory();
  }, []);

  const fetchProjects = async () => {
    const data = await api.get('projects', 'select=id,name');
    setProjects(data || []);
  };

  const fetchUnits = async (projectId: string) => {
    const data = await api.get('units', `project_id=eq.${projectId}&order=unit_number.asc`);
    setUnits(data || []);
  };

  const fetchProgressHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get('construction_progress', 'select=*,project:projects(name),unit:units(unit_number)&order=report_date.desc');
      setProgressItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) fetchUnits(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedUnitId && isInputMode) {
      loadRABForProgress();
    }
  }, [selectedUnitId, isInputMode]);

  const loadRABForProgress = async () => {
    try {
      setLoading(true);
      // 1. Get RAB Projects for this unit
      const rabs = await api.get('rab_projects', `unit_id=eq.${selectedUnitId}`);
      if (!rabs || rabs.length === 0) {
        setTree([]);
        return;
      }
      const rabProjectIds = rabs.map((r: any) => r.id);
      const totalAnggaran = rabs.reduce((sum: number, r: any) => sum + Number(r.total_anggaran || 0), 0);

      // 2. Get RAB Items
      const items = await api.get('rab_items', `rab_project_id=in.(${rabProjectIds.join(',')})&order=id.asc`);
      
      // 3. Get Latest Progress for each item
      const history = await api.get('construction_progress', `unit_id=eq.${selectedUnitId}&select=rab_item_id,percentage&order=report_date.desc`);
      
      // Map to latest percentage per item
      const latestProgressMap: Record<string, number> = {};
      (history || []).forEach((h: any) => {
        if (h.rab_item_id && latestProgressMap[h.rab_item_id] === undefined) {
          latestProgressMap[h.rab_item_id] = Number(h.percentage);
        }
      });

      // 4. Build Tree with Weighting
      const buildTree = (parentId: string | null, level: number): RABNode[] => {
        return (items || [])
          .filter((item: any) => item.parent_id === parentId)
          .map((item: any) => {
            const children = buildTree(item.id, level + 1);
            const itemTotal = (item.material_price || 0) * (item.volume || 1) * (item.koeff || 1) + 
                             (item.wage_price || 0) * (item.volume || 1) * (item.koeff || 1);
            
            return {
              id: item.id,
              parent_id: item.parent_id,
              level: item.level,
              uraian: item.uraian,
              total_price: itemTotal,
              weight: totalAnggaran > 0 ? (itemTotal / totalAnggaran) * 100 : 0,
              current_progress: latestProgressMap[item.id] || 0,
              new_progress: latestProgressMap[item.id] || 0,
              children,
              isExpanded: level < 2
            };
          });
      };

      setTree(buildTree(null, 1));
    } finally {
      setLoading(false);
    }
  };

  const updateNodeProgress = (nodes: RABNode[], id: string, val: number): RABNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, new_progress: val };
      }
      if (node.children.length > 0) {
        return { ...node, children: updateNodeProgress(node.children, id, val) };
      }
      return node;
    });
  };

  const handleSaveBatch = async () => {
    const reports: any[] = [];
    const traverse = (nodes: RABNode[]) => {
      nodes.forEach(node => {
        if (node.new_progress !== node.current_progress) {
          reports.push({
            project_id: selectedProjectId,
            unit_id: selectedUnitId,
            rab_item_id: node.id,
            report_date: reportDate,
            percentage: node.new_progress,
            description: generalDescription,
            created_by: profile?.id
          });
        }
        if (node.children.length > 0) traverse(node.children);
      });
    };
    traverse(tree);

    if (reports.length === 0) {
      alert('Tidak ada perubahan progress untuk disimpan.');
      return;
    }

    try {
      setLoading(true);
      await api.insert('construction_progress', reports);
      alert(`Berhasil menyimpan ${reports.length} laporan progress.`);
      setIsInputMode(false);
      fetchProgressHistory();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus laporan progress ini?')) return;
    try {
      setLoading(true);
      await api.delete('construction_progress', id);
      fetchProgressHistory();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallProgress = () => {
    let weightedSum = 0;
    const traverse = (nodes: RABNode[]) => {
      nodes.forEach(node => {
        if (node.children.length === 0) { // Only leaf items
          weightedSum += (node.new_progress / 100) * node.weight;
        } else {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return weightedSum;
  };

  const renderTreeRows = (nodes: RABNode[]) => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        <TR className={cn(
          "hover:bg-slate-50 transition-colors border-b border-slate-100",
          node.children.length > 0 ? "bg-slate-50/30" : "bg-white"
        )}>
          <TD className="px-4 py-3">
            <div className="flex items-center" style={{ paddingLeft: `${(node.level - 1) * 20}px` }}>
              {node.children.length > 0 && (
                <button 
                  onClick={() => {
                    const toggleNode = (list: RABNode[]): RABNode[] => list.map(n => 
                      n.id === node.id ? { ...n, isExpanded: !n.isExpanded } : { ...n, children: toggleNode(n.children) }
                    );
                    setTree(toggleNode(tree));
                  }}
                  className="mr-2 p-1 hover:bg-slate-200 rounded"
                >
                  {node.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              )}
              <span className={cn(
                "text-sm tracking-tight",
                node.children.length > 0 ? "font-black text-accent-dark" : "font-medium text-text-primary"
              )}>
                {node.uraian}
              </span>
            </div>
          </TD>
          <TD className="px-4 py-3 text-right font-bold text-xs text-text-muted">
            {node.weight.toFixed(2)}%
          </TD>
          <TD className="px-4 py-3 text-center">
            <span className="text-[11px] font-black text-emerald-600">{node.current_progress}%</span>
          </TD>
          <TD className="px-4 py-3 w-32">
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="0" max="100"
                className="w-full h-9 glass-input rounded-lg px-3 text-center font-black text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                value={node.new_progress}
                onChange={(e) => setTree(updateNodeProgress(tree, node.id, Number(e.target.value)))}
              />
              <span className="text-xs font-black text-text-muted">%</span>
            </div>
          </TD>
          <TD className="px-4 py-3 text-center">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  node.new_progress === 100 ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${node.new_progress}%` }}
              />
            </div>
          </TD>
        </TR>
        {node.isExpanded && node.children.length > 0 && renderTreeRows(node.children)}
      </React.Fragment>
    ));
  };

  if (isInputMode) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setIsInputMode(false)} className="p-2 h-12 w-12 rounded-2xl glass-card">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-text-primary tracking-tight italic">INPUT PROGRESS FISIK</h1>
              <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Update bobot capaian lapangan</p>
            </div>
          </div>
          <Button onClick={handleSaveBatch} className="rounded-2xl px-8 h-12 shadow-3d hover:scale-105 transition-all" isLoading={loading}>
            <Save className="w-5 h-5 mr-2" /> SIMPAN LAPORAN
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 p-6 space-y-6 bg-white/40 backdrop-blur-xl border-white/60">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3" /> Tanggal Laporan</label>
                <input type="date" className="w-full h-12 glass-input rounded-2xl px-4 font-bold" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Building2 className="w-3 h-3" /> Proyek</label>
                <select className="w-full h-12 glass-input rounded-2xl px-4 font-bold" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                  <option value="">Pilih Proyek</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Home className="w-3 h-3" /> Unit</label>
                <select className="w-full h-12 glass-input rounded-2xl px-4 font-bold" value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} disabled={!selectedProjectId}>
                  <option value="">Pilih Unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-white/40">
              <div className="text-center p-6 rounded-3xl bg-primary/10 border border-primary/20 shadow-3d-inset">
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Estimasi Progress Unit</div>
                <div className="text-5xl font-black text-primary tracking-tighter">{calculateOverallProgress().toFixed(1)}%</div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-3 p-0 overflow-hidden bg-white/40 backdrop-blur-xl border-white/60 min-h-[600px]">
            <div className="p-4 bg-white/60 border-b border-white/40">
               <textarea 
                className="w-full glass-input rounded-2xl p-4 text-sm font-medium focus:outline-none min-h-[80px]" 
                placeholder="Tuliskan catatan lapangan atau kendala hari ini..."
                value={generalDescription}
                onChange={(e) => setGeneralDescription(e.target.value)}
               />
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <Table className="min-w-[800px]">
                <THead>
                  <TR className="bg-slate-100/50 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <TH className="px-4 py-4">Uraian Pekerjaan</TH>
                    <TH className="px-4 py-4 text-right">Bobot</TH>
                    <TH className="px-4 py-4 text-center">Sblmnya</TH>
                    <TH className="px-4 py-4 text-center">Update (%)</TH>
                    <TH className="px-4 py-4 text-center w-40">Visual</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading ? (
                    <TR><TD colSpan={5} className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary mx-auto"></div></TD></TR>
                  ) : tree.length === 0 ? (
                    <TR><TD colSpan={5} className="py-20 text-center text-text-secondary italic">Pilih Unit untuk memuat struktur RAB</TD></TR>
                  ) : renderTreeRows(tree)}
                </TBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">PROGRESS BANGUN</h1>
          <p className="text-sm font-black text-text-secondary uppercase tracking-[0.3em] mt-1 opacity-60">Monitor Capaian Lapangan Secara Real-time</p>
        </div>
        <Button onClick={() => setIsInputMode(true)} className="rounded-2xl px-8 h-14 shadow-3d hover:scale-105 transition-all text-lg font-black">
          <Plus className="w-6 h-6 mr-2" /> INPUT LAPORAN BARU
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary to-accent-lavender text-white shadow-3d border-none group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><Building2 size={120} /></div>
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Unit Berjalan</div>
          <div className="text-4xl font-black mt-2 tracking-tighter italic">{new Set(progressItems.map(p => p.unit_id)).size} Units</div>
        </Card>
        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Laporan Terbaru</div>
          <div className="text-4xl font-black mt-2 tracking-tighter text-text-primary italic">{progressItems.length} Reports</div>
        </Card>
        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Kepatuhan Update</div>
          <div className="text-4xl font-black mt-2 tracking-tighter text-emerald-600 italic">ON TIME</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden bg-white/40 backdrop-blur-xl border-white/60 shadow-3d">
        <div className="p-6 border-b border-white/40 flex flex-col md:flex-row gap-4 bg-white/20">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input 
              placeholder="Cari deskripsi laporan atau unit..." 
              className="w-full h-12 glass-input rounded-2xl pl-12 pr-4 font-bold focus:outline-none" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-full">
            <THead>
              <TR className="bg-slate-100/50 text-[10px] font-black uppercase tracking-widest text-text-muted">
                <TH className="px-6 py-5">Unit & Tanggal</TH>
                <TH className="px-6 py-5">Pekerjaan</TH>
                <TH className="px-6 py-5">Progress</TH>
                <TH className="px-6 py-5">Pelapor</TH>
                <TH className="px-6 py-5 text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={5} className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary mx-auto"></div></TD></TR>
              ) : progressItems.length === 0 ? (
                <TR><TD colSpan={5} className="py-20 text-center text-text-secondary italic">Belum ada laporan progress.</TD></TR>
              ) : (
                progressItems
                  .filter(p => p.unit?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((item) => (
                    <TR key={item.id} className="hover:bg-white/40 transition-colors border-b border-white/20">
                      <TD className="px-6 py-4">
                        <div className="text-sm font-black text-text-primary italic uppercase tracking-tight">{item.unit?.unit_number || 'Umum'}</div>
                        <div className="text-[10px] font-black text-text-muted flex items-center gap-1 mt-1"><Clock size={10} /> {formatDate(item.report_date)}</div>
                      </TD>
                      <TD className="px-6 py-4">
                        <div className="text-xs font-bold text-text-primary line-clamp-1">{item.description || '-'}</div>
                      </TD>
                      <TD className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5 min-w-[80px]">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                          </div>
                          <span className="text-xs font-black text-primary">{item.percentage}%</span>
                        </div>
                      </TD>
                      <TD className="px-6 py-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">Project Supervisor</span>
                      </TD>
                      <TD className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {item.photo_url && (
                             <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Lihat Foto">
                               <Camera className="w-4 h-4" />
                             </Button>
                           )}
                           <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(item.id)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ConstructionProgressPage;
