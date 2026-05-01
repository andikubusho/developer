import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, BarChart3, ArrowLeft, TrendingUp, TrendingDown, Target, Wallet, Package, HardHat, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { Project, RAB, PurchaseOrder, ProjectOpname } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';
import { getMockData } from '../lib/storage';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';

const RealCostPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMockMode, setDivision } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState({
    rabTotal: 0,
    rabMaterial: 0,
    rabWage: 0,
    materialActual: 0,
    wageActual: 0,
    totalActual: 0,
    variance: 0,
    materialVariance: 0,
    wageVariance: 0,
    rabItems: [] as any[],
    materialOrders: [] as PurchaseOrder[],
    wageOpnames: [] as ProjectOpname[]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchUnits(selectedProjectId);
      fetchRealCostData();
    }
  }, [selectedProjectId, selectedUnitId]);

  const fetchUnits = async (projectId: string) => {
    if (isMockMode) {
      setUnits([
        { id: 'u1', unit_number: 'South - 09' },
        { id: 'u2', unit_number: 'North - 12' }
      ]);
      return;
    }
    const data = await api.get('units', `project_id=eq.${projectId}&order=unit_number.asc`);
    setUnits(data || []);
  };

  const fetchProjects = async () => {
    if (isMockMode) {
      const mockProjects: Project[] = [
        { id: '1', name: 'Golden Canyon', location: 'Bogor', description: '', total_units: 50, status: 'ongoing', created_at: '', developer: '', settings: { bunga_flat: 0, dp_percentage: 0, booking_fee: 0 }, active: true },
        { id: '2', name: 'DV Village', location: 'Depok', description: '', total_units: 30, status: 'ongoing', created_at: '', developer: '', settings: { bunga_flat: 0, dp_percentage: 0, booking_fee: 0 }, active: true }
      ];
      setProjects(mockProjects);
      setSelectedProjectId('1');
      setLoading(false);
      return;
    }

    const data = await api.get('projects', 'select=*');
    setProjects(data || []);
    if (data && data.length > 0) setSelectedProjectId(data[0].id);
    setLoading(false);
  };

  const fetchRealCostData = async () => {
    setLoading(true);
    if (isMockMode) {
      // Mock data for Real Cost Calculation
      const mockRab: RAB[] = [
        { id: '1', project_id: '1', item_name: 'Pekerjaan Tanah', category: 'Persiapan', quantity: 1, unit: 'ls', unit_price: 5000000, total_price: 5000000, created_at: '' },
        { id: '2', project_id: '1', item_name: 'Semen Gresik', category: 'Material', quantity: 100, unit: 'sak', unit_price: 65000, total_price: 6500000, created_at: '' },
        { id: '3', project_id: '1', item_name: 'Besi 10mm', category: 'Material', quantity: 50, unit: 'btg', unit_price: 95000, total_price: 4750000, created_at: '' },
        { id: '4', project_id: '1', item_name: 'Pek. Dinding', category: 'Upah', quantity: 1, unit: 'ls', unit_price: 15000000, total_price: 15000000, created_at: '' }
      ];

      const mockOrders: PurchaseOrder[] = [
        { id: '1', po_number: 'PO001', project_id: '1', material_id: '1', supplier: 'TB. Jaya', quantity: 100, unit_price: 68000, total_price: 6800000, status: 'received', order_date: '', created_at: '' },
        { id: '2', po_number: 'PO002', project_id: '1', material_id: '2', supplier: 'TB. Jaya', quantity: 50, unit_price: 92000, total_price: 4600000, status: 'received', order_date: '', created_at: '' }
      ];

      const mockOpnames: ProjectOpname[] = [
        { id: '1', date: '', project_id: '1', worker_name: 'CV Jati', work_description: 'Dinding Lt 1', previous_percentage: 0, current_percentage: 100, amount: 14500000, status: 'paid' }
      ];

      const rabTotal = mockRab.reduce((sum, r) => sum + r.total_price, 0);
      const materialActual = mockOrders.reduce((sum, o) => sum + o.total_price, 0);
      const wageActual = mockOpnames.reduce((sum, o) => sum + o.amount, 0);
      const totalActual = materialActual + wageActual;

      setData({
        rabTotal,
        materialActual,
        wageActual,
        totalActual,
        variance: rabTotal - totalActual,
        rabItems: mockRab,
        materialOrders: mockOrders,
        wageOpnames: mockOpnames
      });
      setLoading(false);
      return;
    }

    try {
      // 1. Get RAB Project IDs for the filter
      let rabProjIdsQuery = `project_id=eq.${selectedProjectId}`;
      if (selectedUnitId) {
        rabProjIdsQuery += `&unit_id=eq.${selectedUnitId}`;
      }
      const rabs = await api.get('rab_projects', rabProjIdsQuery);
      const rabProjectIds = (rabs || []).map((r: any) => r.id);

      // 2. Fetch Material PRs for unit filtering (since PO doesn't have unit_id directly)
      let poQuery = `select=*,project:projects(name),supplier:suppliers(name)&status=eq.received&project_id=eq.${selectedProjectId}`;
      if (selectedUnitId) {
        // We need to find PRs for this unit first
        const prs = await api.get('purchase_requests', `project_id=eq.${selectedProjectId}&unit_id=eq.${selectedUnitId}&select=id`);
        const prIds = (prs || []).map((p: any) => p.id);
        if (prIds.length > 0) {
          poQuery += `&pr_id=in.(${prIds.join(',')})`;
        } else {
          // If no PRs for this unit, then no unit-specific material cost
          poQuery += `&id=eq.00000000-0000-0000-0000-000000000000`; // Force empty
        }
      }

      // 3. Wage Opname query
      let opnameQuery = `select=id&project_id=eq.${selectedProjectId}&status=in.(approved,paid)`;
      if (selectedUnitId) {
        opnameQuery += `&unit_id=eq.${selectedUnitId}`;
      }

      const [rabItems, orderData, opnameMasterData] = await Promise.all([
        rabProjectIds.length > 0 ? api.get('rab_items', `rab_project_id=in.(${rabProjectIds.join(',')})`) : Promise.resolve([]),
        api.get('purchase_orders', poQuery),
        api.get('project_opnames', opnameQuery)
      ]);

      const opnameIds = (opnameMasterData || []).map((o: any) => o.id);
      const opnameItemData = opnameIds.length > 0 
        ? await api.get('project_opname_items', `opname_id=in.(${opnameIds.join(',')})`)
        : [];

      const rabMaterial = (rabItems || []).reduce((sum: number, r: any) => sum + ((r.material_price || 0) * (r.volume || 1) * (r.koeff || 1)), 0);
      const rabWage = (rabItems || []).reduce((sum: number, r: any) => sum + ((r.wage_price || 0) * (r.volume || 1) * (r.koeff || 1)), 0);
      const rabTotal = rabMaterial + rabWage;

      const materialActual = orderData?.reduce((sum: number, o: any) => sum + Number(o.total_price), 0) || 0;
      const wageActual = (opnameItemData || [])?.reduce((sum: number, o: any) => sum + Number(o.amount_opname), 0) || 0;
      const totalActual = materialActual + wageActual;

      setData({
        rabTotal,
        rabMaterial,
        rabWage,
        materialActual,
        wageActual,
        totalActual,
        variance: rabTotal - totalActual,
        materialVariance: rabMaterial - materialActual,
        wageVariance: rabWage - wageActual,
        rabItems: rabItems || [],
        materialOrders: orderData || [],
        wageOpnames: opnameItemData || []
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const chartData = [
    { name: 'Plan (RAB)', value: data.rabTotal },
    { name: 'Actual Cost', value: data.totalActual }
  ];

  const breakdownData = [
    { name: 'Material', value: data.materialActual },
    { name: 'Upah/Opname', value: data.wageActual }
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')} 
            className="w-14 h-14 glass-card flex items-center justify-center text-text-muted hover:text-accent-lavender transition-all hover:scale-110 active:shadow-3d-inset"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-text-primary tracking-tighter uppercase italic italic">Real Cost <span className="text-accent-lavender not-italic">Analysis</span></h1>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-70">Budget vs Actual Comparison & Variance Report</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Target className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-lavender" />
            <select 
              className="pl-14 pr-10 py-4 glass-input-3d text-xs font-black appearance-none cursor-pointer tracking-tight uppercase"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedUnitId('');
              }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <Package className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            <select 
              className="pl-14 pr-10 py-4 glass-input-3d text-xs font-black appearance-none cursor-pointer tracking-tight uppercase"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              <option value="">Semua Unit / Global</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
            </select>
          </div>
          <button className="btn-3d bg-accent-lavender text-text-primary px-8 h-[52px]">
            Ekspor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Total RAB</p>
            <p className="text-2xl font-black text-text-primary tracking-tighter italic">{formatCurrency(data.rabTotal)}</p>
            <div className="mt-4 px-3 py-1.5 rounded-lg shadow-3d-inset bg-white/50 text-[9px] font-black uppercase text-accent-lavender">
              Material: {formatCurrency(data.rabMaterial)}
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-emerald-500">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Actual Material</p>
            <p className={cn(
              "text-2xl font-black tracking-tighter italic",
              data.materialVariance >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {formatCurrency(data.materialActual)}
            </p>
            <div className={cn(
              "mt-4 px-3 py-1.5 rounded-lg shadow-3d-inset text-[9px] font-black uppercase",
              data.materialVariance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {data.materialVariance >= 0 ? `Hemat ${formatCurrency(data.materialVariance)}` : `Over ${formatCurrency(Math.abs(data.materialVariance))}`}
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-accent-lavender">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Actual Wages</p>
            <p className={cn(
              "text-2xl font-black tracking-tighter italic",
              data.wageVariance >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {formatCurrency(data.wageActual)}
            </p>
            <div className={cn(
              "mt-4 px-3 py-1.5 rounded-lg shadow-3d-inset text-[9px] font-black uppercase",
              data.wageVariance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {data.wageVariance >= 0 ? `Hemat ${formatCurrency(data.wageVariance)}` : `Over ${formatCurrency(Math.abs(data.wageVariance))}`}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Total Real Cost</p>
            <p className="text-2xl font-black text-text-primary tracking-tighter italic">{formatCurrency(data.totalActual)}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest italic">{data.rabTotal > 0 ? ((data.totalActual / data.rabTotal) * 100).toFixed(1) : 0}%</span>
              <div className="flex-1 ml-4 bg-white/50 shadow-3d-inset rounded-full h-2 overflow-hidden">
                <div 
                  className={cn("h-full", (data.totalActual / data.rabTotal) > 1 ? "bg-rose-500" : "bg-accent-lavender shadow-glow-lavender")}
                  style={{ width: `${Math.min((data.totalActual / data.rabTotal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Budget vs Actual (By Category)" subtitle="Perbandingan budget vs realisasi per kategori">
          <div className="h-[350px] min-h-[350px] w-full min-w-0 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={[
                  { name: 'Material', plan: data.rabMaterial, actual: data.materialActual },
                  { name: 'Upah', plan: data.rabWage, actual: data.wageActual }
                ]} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} tickFormatter={(val) => `Rp${val/1000000}M`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                <Bar name="Budget (Plan)" dataKey="plan" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40} />
                <Bar name="Actual Spent" dataKey="actual" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-4">
          <div className="flex items-center gap-10">
            <button className="tab-underline active uppercase tracking-widest text-[11px] italic">Wages / Opname</button>
            <button className="tab-underline uppercase tracking-widest text-[11px] italic">Material Orders</button>
          </div>
          <div className="tab-pill-container">
            <button className="tab-pill active">Mingguan</button>
            <button className="tab-pill">Bulanan</button>
            <button className="tab-pill">Semua</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-0 border-none shadow-premium overflow-hidden">
            <div className="p-6 border-b border-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent-lavender/20 rounded-xl text-primary">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-text-primary uppercase tracking-tight text-sm">Update Pembayaran Upah</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total: {data.wageOpnames.length} Records</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary font-black text-[10px] uppercase tracking-widest bg-white/30 border border-white/40 rounded-xl px-4 py-2 hover:bg-white transition-all">View All</Button>
            </div>
            <div className="divide-y divide-white/20">
              {data.wageOpnames.map((op) => (
                <div key={op.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/20 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 rounded-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                    <div>
                      <p className="text-[13px] font-black text-text-primary uppercase tracking-tight">{op.worker_name}</p>
                      <p className="text-[10px] font-medium text-text-muted mt-0.5">{op.work_description}</p>
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <p className="text-[13px] font-black text-text-primary tracking-tight">{formatCurrency(op.amount)}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Approved</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0 border-none shadow-premium overflow-hidden">
            <div className="p-6 border-b border-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-text-primary uppercase tracking-tight text-sm">Material Terkirim</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total: {data.materialOrders.length} Received</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 hover:bg-white transition-all">View Orders</Button>
            </div>
            <div className="divide-y divide-white/20">
              {data.materialOrders.map((order) => (
                <div key={order.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/20 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 rounded-full bg-emerald-200 group-hover:bg-emerald-500 transition-colors"></div>
                    <div>
                      <p className="text-[13px] font-black text-text-primary uppercase tracking-tight">PO: {order.po_number}</p>
                      <p className="text-[10px] font-medium text-text-muted mt-0.5">Supplier: {order.supplier}</p>
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <p className="text-[13px] font-black text-text-primary tracking-tight">{formatCurrency(order.total_price)}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <Package className="w-3 h-3 text-emerald-500" />
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Received</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RealCostPage;

