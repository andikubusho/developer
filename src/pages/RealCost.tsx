import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  Target, 
  AlertCircle, 
  HardHat, 
  Package,
  Eye,
  X,
  Search,
  Filter, 
  BarChart3, 
  ArrowLeft, 
  Info,
  UserCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatNumber, formatDate, cn } from '../lib/utils';
import { api } from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const RealCostPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [globalRabs, setGlobalRabs] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>(''); // '': semua, 'unit:id', 'rab:id'
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState({
    rabTotal: 0,
    rabMaterial: 0,
    rabWage: 0,
    materialActual: 0,
    wageActual: 0,
    totalActual: 0,
    variance: 0,
    physicalProgress: 0,
    rabProjects: [] as any[],
    materialUsages: [] as any[],
    wageOpnames: [] as any[]
  });
  
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'history'>('summary');

  useEffect(() => {
    fetchProjects();
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchUnitsAndGlobalRabs(selectedProjectId);
      fetchRealCostData();
    }
  }, [selectedProjectId, selectedFilter, selectedWorkerId]);

  const fetchProjects = async () => {
    const data = await api.get('projects', 'select=*');
    setProjects(data || []);
    if (data && data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id);
  };

  const fetchWorkers = async () => {
    const data = await api.get('worker_masters', 'select=id,name,type&status=eq.active&order=name.asc');
    setWorkers(data || []);
  };

  const fetchUnitsAndGlobalRabs = async (projectId: string) => {
    const [unitsData, rabsWithUnit, globalRabsData] = await Promise.all([
      api.get('units', `project_id=eq.${projectId}&order=unit_number.asc`),
      api.get('rab_projects', `project_id=eq.${projectId}&unit_id=not.is.null&select=unit_id`),
      api.get('rab_projects', `project_id=eq.${projectId}&unit_id=is.null&order=nama_proyek.asc`)
    ]);
    const unitIdsWithRab = new Set((rabsWithUnit || []).map((r: any) => r.unit_id));
    setUnits((unitsData || []).filter((u: any) => unitIdsWithRab.has(u.id)));
    setGlobalRabs(globalRabsData || []);
  };

  const fetchRealCostData = async () => {
    setLoading(true);
    try {
      // Parse filter: '' | 'unit:id' | 'rab:id'
      const filterType = selectedFilter.startsWith('unit:') ? 'unit'
        : selectedFilter.startsWith('rab:') ? 'rab' : 'all';
      const filterId = selectedFilter.split(':')[1] || '';

      // 1. Get RAB Project IDs
      let rabProjIdsQuery = `project_id=eq.${selectedProjectId}`;
      if (filterType === 'unit') rabProjIdsQuery += `&unit_id=eq.${filterId}`;
      else if (filterType === 'rab') rabProjIdsQuery += `&id=eq.${filterId}`;
      const rabs = await api.get('rab_projects', rabProjIdsQuery);
      const rabProjectIds = (rabs || []).map((r: any) => r.id);

      if (rabProjectIds.length === 0) {
        setData({ ...data, rabTotal: 0, totalActual: 0, rabProjects: [] });
        return;
      }

      // 2. Parallel Fetch: RAB Items, Material Usages, Wage Opnames, and Physical Progress
      let usageQuery = `select=*,material:materials(name,unit),variant:material_variants(merk,harga_terakhir)&rab_project_id=in.(${rabProjectIds.join(',')})`;
      let opnameQuery = `select=id&project_id=eq.${selectedProjectId}&status=in.(approved,paid)`;
      let progressQuery = `select=rab_item_id,percentage&order=report_date.desc`;

      if (filterType === 'unit') {
        opnameQuery += `&unit_id=eq.${filterId}`;
        progressQuery += `&unit_id=eq.${filterId}`;
      }
      if (selectedWorkerId) {
        usageQuery += `&worker_id=eq.${selectedWorkerId}`;
        opnameQuery += `&worker_id=eq.${selectedWorkerId}`;
      }

      const [rabItems, usageData, opnameMasterData, progressHistory] = await Promise.all([
        api.get('rab_items', `rab_project_id=in.(${rabProjectIds.join(',')})`),
        api.get('material_usages', usageQuery),
        api.get('project_opnames', opnameQuery),
        api.get('construction_progress', progressQuery)
      ]);

      const opnameIds = (opnameMasterData || []).map((o: any) => o.id);
      const opnameItemData = opnameIds.length > 0 
        ? await api.get('project_opname_items', `opname_id=in.(${opnameIds.join(',')})`)
        : [];

      // Latest Progress Map
      const latestProgressMap: Record<string, number> = {};
      (progressHistory || []).forEach((h: any) => {
        if (h.rab_item_id && latestProgressMap[h.rab_item_id] === undefined) {
          latestProgressMap[h.rab_item_id] = Number(h.percentage);
        }
      });

      // 3. Process & Merge Data
      const rabMaterial = (rabItems || []).reduce((sum: number, r: any) => sum + ((r.material_price || 0) * (r.volume || 1) * (r.koeff || 1)), 0);
      const rabWage = (rabItems || []).reduce((sum: number, r: any) => sum + ((r.wage_price || 0) * (r.volume || 1) * (r.koeff || 1)), 0);
      const rabTotal = rabMaterial + rabWage;

      const materialActual = (usageData || []).reduce((sum: number, u: any) => sum + (Number(u.qty) * (u.variant?.harga_terakhir || 0)), 0);
      const wageActual = (opnameItemData || []).reduce((sum: number, o: any) => sum + Number(o.amount_opname), 0);
      const totalActual = materialActual + wageActual;

      const processedRabProjects = (rabs || []).map((rp: any) => {
        const itemsForThisRab = (rabItems || []).filter((ri: any) => ri.rab_project_id === rp.id);
        const totalBudget = Number(rp.total_anggaran || 0);

        const itemsWithCosts = itemsForThisRab
          .filter(ri => ri.level === 3 || ri.is_manual)
          .map(ri => {
            const itemMatActual = (usageData || []).filter((u: any) => u.rab_item_id === ri.id).reduce((sum: number, u: any) => sum + (Number(u.qty) * (u.variant?.harga_terakhir || 0)), 0);
            const itemWageActual = (opnameItemData || []).filter((o: any) => o.rab_item_id === ri.id).reduce((sum: number, o: any) => sum + Number(o.amount_opname), 0);
            
            const iBudgetMat = (ri.material_price || 0) * (ri.volume || 1) * (ri.koeff || 1);
            const iBudgetWage = (ri.wage_price || 0) * (ri.volume || 1) * (ri.koeff || 1);
            const iBudget = iBudgetMat + iBudgetWage;
            const iActual = itemMatActual + itemWageActual;
            const iProgressFisik = latestProgressMap[ri.id] || 0;
            const weight = totalBudget > 0 ? (iBudget / totalBudget) : 0;

            return {
              ...ri,
              iBudget,
              iActual,
              iProgressFisik,
              weight,
              efficiency: iBudget > 0 ? (1 - (iActual / iBudget)) * 100 : 0
            };
          });

        const totalPhysical = itemsWithCosts.reduce((sum, i) => sum + (i.iProgressFisik * i.weight), 0);

        return {
          ...rp,
          totalBudget,
          totalActual: itemsWithCosts.reduce((sum, i) => sum + i.iActual, 0),
          totalPhysical,
          items: itemsWithCosts
        };
      });

      const overallPhysical = processedRabProjects.reduce((sum, rp) => {
        const weight = rabTotal > 0 ? (rp.totalBudget / rabTotal) : 0;
        return sum + (rp.totalPhysical * weight);
      }, 0);

      setData({
        rabTotal,
        rabMaterial,
        rabWage,
        materialActual,
        wageActual,
        totalActual,
        variance: rabTotal - totalActual,
        physicalProgress: overallPhysical,
        rabProjects: processedRabProjects,
        materialUsages: usageData || [],
        wageOpnames: opnameItemData || []
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'RAB (Budget)', value: data.rabTotal },
    { name: 'Actual Cost', value: data.totalActual }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/')} className="w-14 h-14 rounded-3xl glass-card flex items-center justify-center text-text-muted hover:text-primary transition-all hover:scale-105 shadow-3d">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter italic uppercase">Analisa Real Cost</h1>
            <p className="text-sm font-black text-text-secondary uppercase tracking-[0.3em] mt-1 opacity-60">Financial vs Physical Performance</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <select className="h-14 glass-input rounded-2xl px-6 font-bold min-w-[200px] shadow-3d" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
             {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
           <select className="h-14 glass-input rounded-2xl px-6 font-bold min-w-[200px] shadow-3d" value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
             <option value="">Semua Unit / Pekerjaan</option>
             {globalRabs.length > 0 && (
               <optgroup label="── PEKERJAAN GLOBAL / FASUM">
                 {globalRabs.map((r: any) => (
                   <option key={r.id} value={`rab:${r.id}`}>{r.nama_proyek}{r.keterangan ? ` - ${r.keterangan}` : ''}</option>
                 ))}
               </optgroup>
             )}
             {units.length > 0 && (
               <optgroup label="── UNIT PROPERTY">
                 {units.map((u: any) => <option key={u.id} value={`unit:${u.id}`}>{u.unit_number}{u.type ? ` - ${u.type}` : ''}</option>)}
               </optgroup>
             )}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-primary text-white shadow-3d border-none relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><DollarSign size={100} /></div>
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Anggaran (RAB)</div>
          <div className="text-3xl font-black mt-2 italic tracking-tighter">{formatCurrency(data.rabTotal)}</div>
        </Card>
        
        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700"><TrendingDown size={100} /></div>
          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Realisasi Biaya (Actual)</div>
          <div className={cn("text-3xl font-black mt-2 italic tracking-tighter", data.totalActual > data.rabTotal ? "text-rose-600" : "text-text-primary")}>
            {formatCurrency(data.totalActual)}
          </div>
        </Card>

        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Progress Fisik Lapangan</div>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-4xl font-black italic tracking-tighter text-emerald-600">{data.physicalProgress.toFixed(1)}%</div>
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
               <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${data.physicalProgress}%` }} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sisa Anggaran (Variance)</div>
          <div className={cn("text-3xl font-black mt-2 italic tracking-tighter", data.variance < 0 ? "text-rose-600" : "text-emerald-600")}>
            {formatCurrency(data.variance)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 bg-white/40 backdrop-blur-xl shadow-3d border-white/60">
           <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-black italic tracking-tight uppercase">Komparasi Per Item Pekerjaan</h3>
             <div className="flex gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase"><div className="w-3 h-3 bg-primary rounded" /> Budget</div>
                <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase"><div className="w-3 h-3 bg-emerald-500 rounded" /> Actual</div>
             </div>
           </div>
           
           <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
              {data.rabProjects.map((rp: any) => (
                <div key={rp.id} className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/60 border border-white/80">
                     <span className="font-black text-sm uppercase italic tracking-tight">{rp.rab_name || 'RAB Project'}</span>
                     <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{rp.totalPhysical.toFixed(1)}% Fisik</span>
                  </div>
                  
                  <div className="grid gap-3">
                    {rp.items.map((item: any) => (
                      <div key={item.id} className="p-5 rounded-2xl bg-white/30 border border-white/40 hover:bg-white/50 transition-all group">
                         <div className="flex justify-between items-start mb-3">
                           <div>
                             <div className="font-bold text-sm text-text-primary">{item.uraian}</div>
                             <div className="text-[9px] font-black text-text-muted uppercase mt-1 tracking-widest">Bobot: {(item.weight * 100).toFixed(2)}%</div>
                           </div>
                           <div className="text-right">
                             <div className={cn("text-sm font-black italic", item.iActual > item.iBudget ? "text-rose-600" : "text-emerald-600")}>
                               {formatCurrency(item.iActual)}
                             </div>
                             <div className="text-[9px] font-black text-text-muted">Budget: {formatCurrency(item.iBudget)}</div>
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 items-center">
                            <div className="space-y-1">
                               <div className="flex justify-between text-[9px] font-black uppercase text-text-muted mb-1">
                                 <span>Progress Fisik</span>
                                 <span>{item.iProgressFisik}%</span>
                               </div>
                               <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${item.iProgressFisik}%` }} />
                               </div>
                            </div>
                            <div className="space-y-1">
                               <div className="flex justify-between text-[9px] font-black uppercase text-text-muted mb-1">
                                 <span>Pemakaian Dana</span>
                                 <span>{((item.iActual / item.iBudget) * 100).toFixed(1)}%</span>
                               </div>
                               <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className={cn("h-full rounded-full transition-all", item.iActual > item.iBudget ? "bg-rose-500" : "bg-primary")} style={{ width: `${Math.min((item.iActual / item.iBudget) * 100, 100)}%` }} />
                               </div>
                            </div>
                         </div>

                         {item.iActual > item.iBudget && (
                           <div className="mt-3 flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">
                              <AlertCircle size={12} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Over Budget: {formatCurrency(item.iActual - item.iBudget)}</span>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
           </div>
        </Card>

        <Card className="p-8 bg-white/40 backdrop-blur-xl shadow-3d border-white/60 flex flex-col">
           <h3 className="text-xl font-black italic tracking-tight uppercase mb-8">Summary Analisa</h3>
           
           <div className="flex-1 flex flex-col justify-center space-y-10">
              <div className="relative h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Material', value: data.materialActual },
                        { name: 'Upah', value: data.wageActual }
                      ]}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                   <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Actual</div>
                   <div className="text-2xl font-black italic tracking-tighter">{formatCurrency(data.totalActual)}</div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Package size={20} /></div>
                       <div>
                          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Biaya Material</div>
                          <div className="font-bold text-sm">{formatCurrency(data.materialActual)}</div>
                       </div>
                    </div>
                    <div className="text-right text-xs font-black text-text-muted">{((data.materialActual / data.totalActual) * 100 || 0).toFixed(1)}%</div>
                 </div>

                 <div className="p-4 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><HardHat size={20} /></div>
                       <div>
                          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Biaya Upah</div>
                          <div className="font-bold text-sm">{formatCurrency(data.wageActual)}</div>
                       </div>
                    </div>
                    <div className="text-right text-xs font-black text-text-muted">{((data.wageActual / data.totalActual) * 100 || 0).toFixed(1)}%</div>
                 </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-3d space-y-3">
                 <div className="text-xs font-black uppercase tracking-widest opacity-60">Status Efisiensi</div>
                 <div className="flex items-center gap-3">
                    {data.variance >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-rose-400" />}
                    <div className="text-lg font-bold leading-tight">
                      {data.variance >= 0 
                        ? `Hemat ${((data.variance / data.rabTotal) * 100 || 0).toFixed(1)}% dari Anggaran`
                        : `Over Budget ${((Math.abs(data.variance) / data.rabTotal) * 100 || 0).toFixed(1)}%`
                      }
                    </div>
                 </div>
                 <p className="text-[10px] opacity-60 leading-relaxed font-medium">Data dihitung berdasarkan akumulasi pemakaian material di gudang dan opname mandor yang sudah disetujui.</p>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default RealCostPage;
