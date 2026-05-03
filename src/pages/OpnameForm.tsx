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
  AlertCircle,
  UserCheck,
  CheckSquare,
  Square,
  Search
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
  worker_id?: string;
  worker_name?: string;
}

const OpnameForm: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [globalRabs, setGlobalRabs] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [tree, setTree] = useState<RABNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentRabId, setCurrentRabId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorker, setBulkWorker] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const data = await api.get('worker_masters', 'select=id,name,type&status=eq.active&order=name.asc');
      setWorkers(data || []);
    } catch (err) {
      console.error('Error fetching workers:', err);
    }
  };

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
      const [unitsData, rabProjectsForUnits] = await Promise.all([
        api.get('units', `project_id=eq.${selectedProjectId}&order=unit_number.asc`),
        api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=not.is.null`)
      ]);
      
      const unitsWithRAB = (unitsData || []).map((u: any) => ({
        ...u,
        hasRAB: (rabProjectsForUnits || []).some((rp: any) => rp.unit_id === u.id)
      }));
      setUnits(unitsWithRAB);

      const gRabs = await api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=is.null`);
      setGlobalRabs(gRabs || []);
    } catch (err) {
      console.error('Error loading units:', err);
    }
  };

  const loadRABTree = async () => {
    try {
      setLoading(true);
      let rabData = [];
        
      if (selectedUnitId.startsWith('RAB_')) {
        const rabId = selectedUnitId.replace('RAB_', '');
        rabData = await api.get('rab_projects', `id=eq.${rabId}`);
      } else {
        rabData = await api.get('rab_projects', `project_id=eq.${selectedProjectId}&unit_id=eq.${selectedUnitId}`);
      }
        
      if (!rabData || rabData.length === 0) {
        setTree([]);
        setCurrentRabId(null);
        setLoading(false);
        return;
      }

      const rabProjectId = rabData[0].id;
      setCurrentRabId(rabProjectId);

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
            
            // Search filter logic
            const matchesSearch = item.uraian.toLowerCase().includes(searchTerm.toLowerCase());
            const hasMatchingChildren = children.length > 0;

            if (searchTerm && !matchesSearch && !hasMatchingChildren) return null;
            
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
              calculated_amount: 0,
              worker_id: '',
              worker_name: ''
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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulkWorker = () => {
    if (!bulkWorker) return;
    
    const updateRecursive = (nodes: RABNode[]): RABNode[] => {
      return nodes.map(node => {
        let updatedNode = node;
        if (selectedIds.has(node.id)) {
          updatedNode = { ...node, worker_id: bulkWorker.id, worker_name: bulkWorker.name };
        }
        if (node.children.length > 0) {
          updatedNode = { ...updatedNode, children: updateRecursive(node.children) };
        }
        return updatedNode;
      });
    };

    setTree(prev => updateRecursive(prev));
    setSelectedIds(new Set());
    setBulkWorker(null);
  };

   const handleSaveBatch = async () => {
    if (!selectedProjectId || !selectedUnitId) {
      alert('Pilih Proyek dan Unit terlebih dahulu');
      return;
    }

    const itemsToSave: any[] = [];
    const traverse = (nodes: RABNode[]) => {
      nodes.forEach(node => {
        if (node.input_percentage > 0) {
          if (node.paid_percentage + node.input_percentage > 100.01) {
             throw new Error(`Item "${node.uraian}" melebihi 100%`);
          }
          
          // Use item-level worker or fallback to header worker
          const finalWorkerId = node.worker_id || '';
          const finalWorkerName = node.worker_name || workerName || 'Umum';

          itemsToSave.push({
            rab_item_id: node.id,
            percentage_opname: node.input_percentage,
            amount_opname: node.calculated_amount,
            worker_id: finalWorkerId || null,
            worker_name: finalWorkerName
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

      // Check if all items have a worker if no header worker is set
      if (!workerName && itemsToSave.some(i => !i.worker_name || i.worker_name === 'Umum')) {
         if (!confirm('Beberapa item belum memiliki nama mandor spesifik. Lanjutkan dengan nama "Umum"?')) return;
      }

      setSubmitting(true);
      
      // GROUP BY worker_id + worker_name to split documents
      const groups: { [key: string]: any[] } = {};
      itemsToSave.forEach(item => {
        const key = `${item.worker_id || 'NULL'}-${item.worker_name}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      // Insert each group as a separate Opname document
      for (const key in groups) {
        const groupItems = groups[key];
        const firstItem = groupItems[0];
        
        // 1. Create Master
        const master = await api.insert('project_opnames', {
          date: opnameDate,
          project_id: selectedProjectId,
          unit_id: selectedUnitId.startsWith('RAB_') ? null : selectedUnitId,
          rab_project_id: currentRabId,
          worker_id: firstItem.worker_id,
          worker_name: firstItem.worker_name,
          status: 'approved',
          created_by: profile?.id
        });
        
        const masterId = master[0].id;

        // 2. Create Details
        await Promise.all(groupItems.map(item => 
          api.insert('project_opname_items', {
            rab_item_id: item.rab_item_id,
            opname_id: masterId,
            percentage_opname: item.percentage_opname,
            amount_opname: item.amount_opname
          })
        ));
      }

      alert(`Batch Opname berhasil disimpan (${Object.keys(groups).length} dokumen dibuat)`);
      navigate('/opname');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    const allLeafIds: string[] = [];
    const traverse = (nodes: RABNode[]) => {
      nodes.forEach(node => {
        if (node.level === 3 || node.is_manual) {
          allLeafIds.push(node.id);
        }
        if (node.children.length > 0) traverse(node.children);
      });
    };
    traverse(tree);

    if (allLeafIds.length > 0 && selectedIds.size === allLeafIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allLeafIds));
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
            node.level === 0 ? "bg-accent-dark/5" : node.level === 1 ? "bg-accent-lavender/5" : "",
            selectedIds.has(node.id) && "bg-primary/5"
          )}>
            <TD className="px-6 py-3 w-10">
              {canInput && (
                <button onClick={() => toggleSelection(node.id)} className="text-primary hover:scale-110 transition-transform">
                  {selectedIds.has(node.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-20" />}
                </button>
              )}
            </TD>
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
            <TD className="px-4 py-3 text-center font-bold text-xs text-text-muted">
              {node.volume ? `${node.volume} ${node.satuan || ''}` : '-'}
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
            <TD className="px-4 py-3">
              {canInput && (
                <select
                  className="w-full h-10 rounded-xl border border-white/60 bg-white/80 px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
                  value={node.worker_id || ''}
                  onChange={(e) => {
                    const w = workers.find(w => w.id === e.target.value);
                    setTree(prev => updateTreeNode(prev, node.id, { 
                      worker_id: e.target.value,
                      worker_name: w?.name || ''
                    }));
                  }}
                >
                  <option value="">-- Gunakan Utama --</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
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

          {/* Unit / Pekerjaan */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center justify-between gap-2 ml-1 opacity-70">
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-accent-dark" /> Pilih Unit / Pekerjaan</span>
              {globalRabs.length > 0 && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">RAB Global Tersedia</span>}
            </label>
            <select
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all disabled:opacity-30"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={!selectedProjectId}
            >
              <option value="">-- Pilih Unit / Pekerjaan --</option>
              
              {globalRabs.length > 0 && (
                <optgroup label="🌐 PEKERJAAN GLOBAL / FASUM">
                  {globalRabs.map(gr => (
                    <option key={gr.id} value={`RAB_${gr.id}`} className="text-blue-700 font-bold">
                       {gr.nama_proyek} - {gr.keterangan || 'Tanpa Judul'}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="🏠 UNIT PROPERTY">
                {units.map(u => (
                  <option 
                    key={u.id} 
                    value={u.id}
                    style={u.hasRAB ? { color: '#059669', fontWeight: 'bold' } : {}}
                  >
                    {u.hasRAB ? '✅ ' : ''}{u.unit_number} - {u.type}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Mandor Utama */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2 ml-1 opacity-70">
              <UserCheck className="w-3.5 h-3.5 text-accent-dark" /> Mandor Utama
            </label>
            <select
              className="w-full h-12 bg-white/50 border-none rounded-2xl px-5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 transition-all"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
            >
              <option value="">-- Pilih Mandor --</option>
              {workers.map(w => <option key={w.id} value={w.name}>{w.name} ({w.type})</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border-white/40 shadow-premium bg-white/20 backdrop-blur-sm rounded-[2rem]">
        <div className="p-6 border-b border-white/40 bg-white/40 flex flex-col md:flex-row items-center gap-6">
           <div className="relative flex-1 max-w-md">
             <input 
               type="text"
               placeholder="Cari item pekerjaan (misal: Listrik, Keramik...)"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full h-12 bg-white/80 border-none rounded-2xl pl-12 pr-5 text-sm font-bold shadow-3d-inset focus:ring-2 focus:ring-primary/20 transition-all"
             />
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
               <Search className="w-4.5 h-4.5" />
             </div>
           </div>
           
           {selectedIds.size > 0 && (
             <div className="flex items-center gap-3 p-2 px-4 bg-primary/10 rounded-2xl border border-primary/20 animate-in zoom-in duration-300">
               <span className="text-[10px] font-black text-primary uppercase whitespace-nowrap">{selectedIds.size} Item Terpilih</span>
               <div className="h-8 w-[1px] bg-primary/20 mx-2" />
               <select 
                 className="h-10 bg-white border-none rounded-xl px-3 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                 onChange={(e) => {
                   const w = workers.find(w => w.id === e.target.value);
                   if (w) setBulkWorker({ id: w.id, name: w.name });
                 }}
                 value={bulkWorker?.id || ''}
               >
                 <option value="">-- Pilih Mandor --</option>
                 {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
               </select>
               <Button size="sm" className="h-10 rounded-xl" onClick={applyBulkWorker} disabled={!bulkWorker}>Terapkan</Button>
             </div>
           )}

           {searchTerm && !selectedIds.size && (
             <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="text-rose-500 font-black text-xs uppercase">Reset</Button>
           )}
        </div>
        <Table className="min-w-[1300px]">
          <THead>
            <TR className="bg-white/60 text-text-primary text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/40">
              <TH className="px-6 py-4 w-10">
                <button 
                  onClick={handleSelectAll} 
                  className="hover:scale-110 transition-transform flex items-center justify-center"
                  title="Pilih Semua"
                >
                  {selectedIds.size > 0 ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5 opacity-20" />
                  )}
                </button>
              </TH>
              <TH className="px-6 py-4">Uraian Pekerjaan</TH>
              <TH className="px-6 py-4 text-center">Volume</TH>
              <TH className="px-6 py-4 text-right">Pagu RAB Upah</TH>
              <TH className="px-6 py-4 text-center">Progress Lalu</TH>
              <TH className="px-6 py-4 text-right">Sisa Pagu</TH>
              <TH className="px-6 py-4 text-center">Progress Baru (%)</TH>
              <TH className="px-6 py-4">Mandor / Subkon</TH>
              <TH className="px-6 py-4 text-right">Nilai Opname</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={9} className="px-6 py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary mx-auto"></div></TD></TR>
            ) : tree.length === 0 ? (
              <TR><TD colSpan={9} className="px-6 py-20 text-center text-text-secondary font-bold italic">Pilih Proyek & Unit untuk memuat data</TD></TR>
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
