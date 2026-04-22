import React, { useState, useEffect } from 'react';
import { Search, Filter, BarChart3, ArrowLeft, TrendingUp, TrendingDown, Target, Wallet, Package, HardHat, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { Project, RAB, PurchaseOrder, ProjectOpname } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getMockData } from '../lib/storage';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';

const RealCostPage: React.FC = () => {
  const { isMockMode, setDivision } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState({
    rabTotal: 0,
    materialActual: 0,
    wageActual: 0,
    totalActual: 0,
    variance: 0,
    rabItems: [] as RAB[],
    materialOrders: [] as PurchaseOrder[],
    wageOpnames: [] as ProjectOpname[]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchRealCostData();
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    if (isMockMode) {
      const mockProjects: Project[] = [
        { id: '1', name: 'Golden Canyon', location: 'Bogor', description: '', total_units: 50, status: 'ongoing', created_at: '' },
        { id: '2', name: 'DV Village', location: 'Depok', description: '', total_units: 30, status: 'ongoing', created_at: '' }
      ];
      setProjects(mockProjects);
      setSelectedProjectId('1');
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('projects').select('*');
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
      const [rabRes, orderRes, opnameRes] = await Promise.all([
        supabase.from('rab').select('*').eq('project_id', selectedProjectId),
        supabase.from('purchase_orders').select('*').eq('project_id', selectedProjectId).eq('status', 'received'),
        supabase.from('project_opnames').select('*').eq('project_id', selectedProjectId).in('status', ['approved', 'paid'])
      ]);

      const rabTotal = rabRes.data?.reduce((sum, r) => sum + r.total_price, 0) || 0;
      const materialActual = orderRes.data?.reduce((sum, o) => sum + o.total_price, 0) || 0;
      const wageActual = opnameRes.data?.reduce((sum, o) => sum + o.amount, 0) || 0;
      const totalActual = materialActual + wageActual;

      setData({
        rabTotal,
        materialActual,
        wageActual,
        totalActual,
        variance: rabTotal - totalActual,
        rabItems: rabRes.data || [],
        materialOrders: orderRes.data || [],
        wageOpnames: opnameRes.data || []
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDivision(null)} className="p-2 h-auto text-slate-400 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Real Cost <span className="text-primary tracking-tighter not-italic">Analysis</span></h1>
            <p className="text-slate-500 font-bold text-sm">Budget vs Actual Comparison & Variance Report</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <select 
              className="pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-primary appearance-none cursor-pointer shadow-sm hover:border-primary transition-all uppercase tracking-tight"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Button variant="primary" className="rounded-2xl h-12 px-6 shadow-premium">
            Ekspor Laporan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="p-6 border-none bg-white shadow-premium relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-20 h-20 text-indigo-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total RAB (Plan)</p>
          <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(data.rabTotal)}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black">BUDGETED</div>
          </div>
        </Card>

        <Card className="p-6 border-none bg-white shadow-premium relative overflow-hidden group border-l-4 border-emerald-500">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-20 h-20 text-emerald-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Real Cost (Actual)</p>
          <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(data.totalActual)}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black">SPENT</div>
          </div>
        </Card>

        <Card className="p-6 border-none bg-white shadow-premium relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            {data.variance >= 0 ? <TrendingDown className="w-20 h-20 text-emerald-600" /> : <TrendingUp className="w-20 h-20 text-rose-600" />}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Variance (Savings/Loss)</p>
          <p className={cn(
            "text-2xl font-black tracking-tighter",
            data.variance >= 0 ? "text-emerald-600" : "text-rose-600"
          )}>
            {data.variance >= 0 ? '+' : ''}{formatCurrency(data.variance)}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className={cn(
              "px-2 py-1 rounded-lg text-[10px] font-black",
              data.variance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {data.variance >= 0 ? 'UNDER BUDGET' : 'OVER BUDGET'}
            </div>
          </div>
        </Card>

        <Card className="p-6 border-none bg-white shadow-premium relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <BarChart3 className="w-20 h-20 text-amber-600" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">% Budget Utilization</p>
          <p className="text-2xl font-black text-slate-900 tracking-tighter">
            {data.rabTotal > 0 ? ((data.totalActual / data.rabTotal) * 100).toFixed(1) : 0}%
          </p>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-1000",
                (data.totalActual / data.rabTotal) > 1 ? "bg-rose-500" : "bg-primary"
              )} 
              style={{ width: `${Math.min((data.totalActual / data.rabTotal) * 100, 100)}%` }}
            ></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Budget vs Actual" subtitle="Perbandingan total anggaran dengan pengeluaran nyata">
          <div className="h-[350px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                  tickFormatter={(val) => `Rp${val/1000000}M`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '16px'
                  }}
                  formatter={(val: number) => [formatCurrency(val), '']}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#e2e8f0' : (data.variance < 0 ? '#ef4444' : '#6366f1')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Pengeluaran Berdasarkan Kategori" subtitle="Distribusi real-cost antara material dan upah kerja">
          <div className="h-[350px] w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-8 mt-4">
              {breakdownData.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{entry.name}</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{formatCurrency(entry.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Detail <span className="text-primary tracking-tighter not-italic">Pengeluaran</span></h2>
          <div className="flex items-center gap-4 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
            <Button variant="ghost" size="sm" className="rounded-xl px-4 font-black text-[10px] h-9 bg-white shadow-sm text-primary uppercase tracking-widest">Wages/Opname</Button>
            <Button variant="ghost" size="sm" className="rounded-xl px-4 font-black text-[10px] h-9 text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Material Orders</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-0 border-none shadow-premium overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl text-primary">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Update Pembayaran Upah</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {data.wageOpnames.length} Records</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary font-black text-[10px] uppercase tracking-widest bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 hover:bg-white transition-all">View All</Button>
            </div>
            <div className="divide-y divide-slate-100">
              {data.wageOpnames.map((op) => (
                <div key={op.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 rounded-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                    <div>
                      <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{op.worker_name}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{op.work_description}</p>
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <p className="text-[13px] font-black text-slate-900 tracking-tight">{formatCurrency(op.amount)}</p>
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
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Material Terkirim</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {data.materialOrders.length} Received</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 hover:bg-white transition-all">View Orders</Button>
            </div>
            <div className="divide-y divide-slate-100">
              {data.materialOrders.map((order) => (
                <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 rounded-full bg-emerald-200 group-hover:bg-emerald-500 transition-colors"></div>
                    <div>
                      <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">PO: {order.po_number}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">Supplier: {order.supplier}</p>
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <p className="text-[13px] font-black text-slate-900 tracking-tight">{formatCurrency(order.total_price)}</p>
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
