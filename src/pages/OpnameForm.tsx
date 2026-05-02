import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Building2, 
  Layers, 
  Calendar, 
  User,
  ChevronRight,
  ChevronDown,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { api } from '../lib/api';
import { Project } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface RABNode {
  id: string;
  parent_id: string | null;
  level: 0 | 1 | 2 | 3;
  uraian: string;
  volume: number | null;
  satuan: string;
  wage_price: number | null;
  is_manual: boolean;
  children: RABNode[];
  isExpanded: boolean;
  // Progress related
  paid_percentage: number;
  paid_amount: number;
  input_percentage: number;
  calculated_amount: number;
}

const OpnameForm: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [hasGlobalRAB, setHasGlobalRAB] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [tree, setTree] = useState<RABNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
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

  const loadUnits = async () => {
    try {
      const [unitsData, rabsData] = await Promise.all([
        api.get('units', `project_id=eq.${selectedProjectId}&order=unit_number.asc`),
        api.get('rab_projects', `project_id=eq.${selectedProjectId}`)
      ]);
      
      const rabList = rabsData || [];
      const rabUnitIds = new Set(rabList.map((r: any) => r.unit_id).filter(Boolean));
      const globalExists = rabList.some((r: any) => !r.unit_id);
      
      setHasGlobalRAB(globalExists);
      
      const enrichedUnits = (unitsData || []).map((u: any) => ({
        ...u,
        hasRAB: rabUnitIds.has(u.id)
      }));
      
      setUnits(enrichedUnits);
    } catch (err) {
      console.error('Error loading units:', err);
    }
  };

  const loadRABTree = async () => {
    try {
      setLoading(true);
      // 1. Get RAB Projects for this project/unit
      let rabs;
      if (selectedUnitId === 'GLOBAL') {
        rabs = await api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=is.null`);
      } else {
        // Try specific unit first, then fallback to global if unit has no specific RAB
        rabs = await api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=eq.${selectedUnitId}`);
        
        if (!rabs || rabs.length === 0) {
          // Try global RAB as fallback
          rabs = await api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=is.null`);
        }
      }

      if (!rabs || rabs.length === 0) {
        setTree([]);
        return;
      }

      const rabProjectId = rabs[0].id;

      // 2. Fetch all items and opname history
      const [items, allOpnameItems] = await Promise.all([
        api.get('rab_items', `rab_project_id=eq.${rabProjectId}&order=uraian.asc`),
        api.get('project_opname_items', `rab_item_id=in.(select id from rab_items where rab_project_id=eq.${rabProjectId})`)
      ]);

      // 3. Get Master Status for all found opname items to filter out 'cancelled'
      const opnameIds = [...new Set((allOpnameItems || []).map((o: any) => o.opname_id))];
      let opnameMasters: any[] = [];
      if (opnameIds.length > 0) {
        opnameMasters = await api.get('project_opnames', `id=in.(${opnameIds.join(',')})`);
      }
      const validOpnameIds = new Set(
        (opnameMasters || [])
          .filter((m: any) => m.status === 'approved' || m.status === 'paid')
          .map((m: any) => m.id)
      );

      // 4. Construct Tree
      const buildTree = (parentId: string | null, level: number): RABNode[] => {
        return (items || [])
          .filter((item: any) => item.parent_id === parentId)
          .map((item: any) => {
            const children = buildTree(item.id, level + 1);
            
            // Only show nodes that have wage_price > 0 OR have children with wage_price > 0
            const hasWage = (item.wage_price || 0) > 0;
            const hasWageChildren = children.length > 0;

            if (!hasWage && !hasWageChildren) return null;

            // Calculate paid progress from history
            const itemHistory = (allOpnameItems || []).filter((oi: any) => oi.rab_item_id === item.id && validOpnameIds.has(oi.opname_id));
            const paidPct = itemHistory.reduce((sum: number, h: any) => sum + Number(h.percentage_opname), 0);
            const paidAmt = itemHistory.reduce((sum: number, h: any) => sum + Number(h.amount_opname), 0);

            return {
              id: item.id,
              parent_id: item.parent_id,
              level: item.level,
              uraian: item.uraian,
              volume: item.volume,
              satuan: item.satuan,
              wage_price: item.wage_price,
              is_manual: item.is_manual,
              children,
              isExpanded: true,
              paid_percentage: paidPct,
              paid_amount: paidAmt,
              input_percentage: 0,
              calculated_amount: 0
            };
          })
          .filter(Boolean) as RABNode[];
      };

      setTree(buildTree(null, 0));
    } catch (err) {
      console.error('Error loading RAB tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTreeNode = (nodes: RABNode[], id: string, updates: Partial<RABNode>): RABNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        const updatedNode = { ...node, ...updates };
        // Recalculate amount if percentage changed
        if ('input_percentage' in updates) {
          const totalBudget = (Number(updatedNode.wage_price) || 0) * (Number(updatedNode.volume) || 1);
          updatedNode.calculated_amount = (Number(updates.input_percentage) / 100) * totalBudget;
        }
        return updatedNode;
      }
      if (node.children.length > 0) {
        return { ...node, children: updateTreeNode(node.children, id, updates) };
      }
      return node;
    });
  };

  const handlePercentageChange = (id: string, value: string) => {
    const pct = parseFloat(value) || 0;
    setTree(prev => updateTreeNode(prev, id, { input_percentage: pct }));
  };

  const handleSaveBatch = async () => {
    if (!selectedProjectId || !selectedUnitId) {
      alert('Pilih Proyek dan Unit terlebih dahulu');
      return;
    }

    // Collect all items with input_percentage > 0
    const itemsToSave: any[] = [];
    const traverse = (nodes: RABNode[]) => {
      nodes.forEach(node => {
        if (node.input_percentage > 0) {
          // Validation: Total progress cannot exceed 100%
          if (node.paid_percentage + node.input_percentage > 100.01) {
             throw new Error(`Item "${node.uraian}" melebihi 100% (Total: ${(node.paid_percentage + node.input_percentage).toFixed(1)}%)`);
          }
          itemsToSave.push({
            rab_item_id: node.id,
            percentage_opname: node.input_percentage,
            amount_opname: node.calculated_amount
          });
        }
        if (node.children.length > 0) traverse(node.children);
      });
    };

    try {
      traverse(tree);
      if (itemsToSave.length === 0) {
        alert('Tidak ada progress baru yang diinput');
        return;
      }

      setSubmitting(true);
      // 1. Create Master
      const master = await api.insert('project_opnames', {
        date: opnameDate,
        project_id: selectedProjectId,
        unit_id: selectedUnitId,
        worker_name: workerName || 'Umum',
        status: 'approved',
        created_by: profile?.id
      });
      
      const masterId = master[0].id;

      // 2. Create Details in batch
      await Promise.all(itemsToSave.map(item => 
        api.insert('project_opname_items', {
          ...item,
          opname_id: masterId
        })
      ));

      alert('Batch Opname berhasil disimpan');
      navigate('/opname');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRows = (nodes: RABNode[], depth: number = 0) => {
    return nodes.map(node => {
      const isLevel3 = node.level === 3;
      const isManual = node.is_manual;
      const canInput = isLevel3 || isManual;
      const totalBudget = (Number(node.wage_price) || 0) * (Number(node.volume) || 1);
      const remainingPct = 100 - node.paid_percentage;

      return (
        <React.Fragment key={node.id}>
          <TR className={cn(
            "hover:bg-white/40 transition-all border-b border-white/20",
            node.level === 0 ? "bg-accent-dark/5" : node.level === 1 ? "bg-accent-lavender/5" : ""
          )}>
            <TD className="px-4 py-3">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
                {node.children.length > 0 ? (
                  <button onClick={() => setTree(prev => updateTreeNode(prev, node.id, { isExpanded: !node.isExpanded }))}>
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
            <TD className="px-4 py-3 text-right font-bold text-sm text-text-secondary">
              {totalBudget > 0 ? formatCurrency(totalBudget) : '-'}
            </TD>
            <TD className="px-4 py-3">
              {totalBudget > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-accent-dark">{node.paid_percentage.toFixed(1)}%</span>
                  <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${node.paid_percentage}%` }} />
                  </div>
                </div>
              )}
            </TD>
            <TD className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
              {totalBudget > 0 ? formatCurrency(totalBudget - node.paid_amount) : '-'}
            </TD>
            <TD className="px-4 py-3">
              {canInput && (
                <div className="flex items-center gap-2 justify-center">
                  <div className="relative w-24">
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full h-10 rounded-xl border border-white/60 bg-white/80 px-3 text-center text-sm font-black focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 disabled:opacity-30"
                      placeholder="0"
                      value={node.input_percentage || ''}
                      onChange={(e) => handlePercentageChange(node.id, e.target.value)}
                      disabled={remainingPct <= 0}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted">%</span>
                  </div>
                </div>
              )}
            </TD>
            <TD className="px-4 py-3 text-right font-black text-primary text-sm">
              {node.input_percentage > 0 ? formatCurrency(node.calculated_amount) : '-'}
            </TD>
          </TR>
          {node.isExpanded && node.children.length > 0 && renderRows(node.children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/opname')} className="p-2 h-auto text-text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight italic uppercase">Input <span className="text-primary tracking-tighter not-italic">Opname Baru</span></h1>
            <p className="text-text-secondary font-bold text-sm">Pengisian progress upah berdasarkan hierarki RAB</p>
          </div>
        </div>
        <Button 
          variant="primary" 
          className="rounded-xl h-12 px-8 shadow-premium"
          onClick={handleSaveBatch}
          isLoading={submitting}
          disabled={loading || tree.length === 0}
        >
          <Save className="w-4 h-4 mr-2" /> Simpan Batch Opname
        </Button>
      </div>

      <Card className="p-8 bg-white/60 backdrop-blur-md border-white/60 shadow-premium rounded-[2.5rem]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Tanggal */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <Calendar className="w-3.5 h-3.5 text-accent-dark" /> Tanggal Opname
            </label>
            <input 
              type="date" 
              value={opnameDate} 
              onChange={(e) => setOpnameDate(e.target.value)}
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
            />
          </div>

          {/* Proyek */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <Building2 className="w-3.5 h-3.5 text-accent-dark" /> Pilih Proyek
            </label>
            <select
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedUnitId(''); }}
            >
              <option value="">-- Pilih Proyek --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Unit */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center justify-between gap-2 ml-1 opacity-70">
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-accent-dark" /> Pilih Unit</span>
              {hasGlobalRAB && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">RAB Global Tersedia</span>}
            </label>
            <select
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all disabled:opacity-30"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={!selectedProjectId}
            >
              <option value="">-- Pilih Unit --</option>
              {hasGlobalRAB && (
                <option value="GLOBAL" className="text-blue-700 font-bold">
                  🌐 GLOBAL / FASILITAS UMUM
                </option>
              )}
              {units.map(u => (
                <option 
                  key={u.id} 
                  value={u.id}
                  style={u.hasRAB ? { color: '#059669', fontWeight: 'bold' } : {}}
                >
                  {u.hasRAB ? '✅ ' : ''}{u.unit_number} - {u.type}
                </option>
              ))}
            </select>
          </div>

          {/* Nama Pekerja */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <User className="w-3.5 h-3.5 text-accent-dark" /> Nama Mandor
            </label>
            <input 
              type="text" 
              placeholder="Contoh: Budi" 
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border-white/40 shadow-premium bg-white/20 backdrop-blur-sm rounded-[2rem]">
        <Table className="min-w-[1200px]">
          <THead>
            <TR className="bg-white/60 text-text-primary text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/40">
              <TH className="px-4 py-5">Uraian Pekerjaan</TH>
              <TH className="px-4 py-5 text-right">Pagu RAB Upah</TH>
              <TH className="px-4 py-5 text-center">Progress Lalu</TH>
              <TH className="px-4 py-5 text-right">Sisa Pagu</TH>
              <TH className="px-4 py-5 text-center w-40">Progress Baru (%)</TH>
              <TH className="px-4 py-5 text-right">Nilai Opname</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={6} className="px-6 py-12 text-center text-text-muted italic">Membangun hierarki RAB...</TD></TR>
            ) : !selectedUnitId ? (
              <TR><TD colSpan={6} className="px-6 py-20 text-center text-text-muted font-bold uppercase tracking-widest text-xs">Pilih Proyek & Unit untuk memuat data</TD></TR>
            ) : tree.length === 0 ? (
              <TR><TD colSpan={6} className="px-6 py-20 text-center text-text-muted font-bold uppercase tracking-widest text-xs">Tidak ada item upah pada unit ini</TD></TR>
            ) : (
              renderRows(tree)
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
};

export default OpnameForm;
