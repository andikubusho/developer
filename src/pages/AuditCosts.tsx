import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowLeft, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, RefreshCw, X, DollarSign
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface CostAuditRow {
  rab_project_id: string;
  project_name: string;
  project_id: string | null;
  budget: number;
  actual: number;          // sum dari purchase orders received untuk rab_project_id ini
  variance: number;        // budget - actual (positif = hemat, negatif = over)
  variance_percent: number;
  status: 'safe' | 'warning' | 'over_budget';
}

const AuditCostsPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CostAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'warning' | 'over_budget'>('all');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [rabProjects, rabItems, materials, purchaseOrders, projects] = await Promise.all([
        api.get('rab_projects', 'select=id,project_id,nama_proyek,keterangan'),
        api.get('rab_items', 'select=id,rab_project_id,parent_id,level,is_manual,volume,koeff,material_id,satuan,uraian'),
        api.get('materials', 'select=id,name,price,unit'),
        api.get('purchase_orders', 'select=id,rab_project_id,status,total_amount,items'),
        api.get('projects', 'select=id,name'),
      ]);

      const projectMap: Record<string, string> = {};
      (projects || []).forEach((p: any) => { projectMap[p.id] = p.name; });

      const materialMap: Record<string, any> = {};
      (materials || []).forEach((m: any) => { materialMap[m.id] = m; });

      // Group rab_items per rab_project_id, hitung budget total
      const itemsByRab: Record<string, any[]> = {};
      (rabItems || []).forEach((it: any) => {
        if (!it.rab_project_id) return;
        (itemsByRab[it.rab_project_id] ||= []).push(it);
      });

      // Calculate budget per rab_project: sum harga × volume untuk semua leaf (level 3) items
      const calcBudget = (items: any[]): number => {
        // Build parent volume map
        const itemMap: Record<string, any> = {};
        items.forEach(it => { itemMap[it.id] = it; });
        let total = 0;
        items.forEach(it => {
          if (it.level !== 3) return;
          const parentVol = it.parent_id ? (Number(itemMap[it.parent_id]?.volume) || 1) : 1;
          const vol = (Number(it.volume) || 0) || ((Number(it.koeff) || 0) * parentVol);
          const mat = it.material_id ? materialMap[it.material_id] : null;
          const price = Number(mat?.price) || 0;
          total += vol * price;
        });
        return total;
      };

      // Calculate actual per rab_project: sum total_amount dari PO yang RECEIVED/APPROVED untuk rab_project_id ini
      const actualByRab: Record<string, number> = {};
      (purchaseOrders || []).forEach((po: any) => {
        if (!po.rab_project_id) return;
        if (po.status !== 'RECEIVED' && po.status !== 'APPROVED' && po.status !== 'COMPLETED') return;
        actualByRab[po.rab_project_id] = (actualByRab[po.rab_project_id] || 0) + (Number(po.total_amount) || 0);
      });

      const built: CostAuditRow[] = (rabProjects || []).map((r: any) => {
        const items = itemsByRab[r.id] || [];
        const budget = calcBudget(items);
        const actual = actualByRab[r.id] || 0;
        const variance = budget - actual;
        const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;
        let status: 'safe' | 'warning' | 'over_budget' = 'safe';
        if (variancePercent < 0) status = 'over_budget';
        else if (variancePercent < 10) status = 'warning';
        return {
          rab_project_id: r.id,
          project_name: r.nama_proyek || r.keterangan || (r.project_id ? projectMap[r.project_id] : '-') || '-',
          project_id: r.project_id,
          budget,
          actual,
          variance,
          variance_percent: variancePercent,
          status,
        };
      });

      // Sort: over_budget dulu (urgent), lalu warning, lalu safe
      built.sort((a, b) => {
        const order = { over_budget: 0, warning: 1, safe: 2 };
        return order[a.status] - order[b.status];
      });

      setRows(built);
    } catch (err) {
      console.error('Audit costs fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (s && !r.project_name.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      safe: rows.filter(r => r.status === 'safe').length,
      warning: rows.filter(r => r.status === 'warning').length,
      over: rows.filter(r => r.status === 'over_budget').length,
      totalBudget: rows.reduce((s, r) => s + r.budget, 0),
      totalActual: rows.reduce((s, r) => s + r.actual, 0),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-text-secondary" />
              <h1 className="text-2xl font-bold text-text-primary">Audit Biaya Proyek</h1>
            </div>
            <p className="text-text-secondary">Bandingkan budget RAB vs aktual (PO Received) per proyek</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Total Budget</p>
          <h3 className="text-lg font-bold text-blue-900 mt-1">{formatCurrency(stats.totalBudget)}</h3>
        </Card>
        <Card className="p-4 bg-violet-50 border-violet-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Total Aktual</p>
          <h3 className="text-lg font-bold text-violet-900 mt-1">{formatCurrency(stats.totalActual)}</h3>
        </Card>
        <Card className={cn("p-4 border", stats.totalBudget - stats.totalActual >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest", stats.totalBudget - stats.totalActual >= 0 ? "text-emerald-700" : "text-rose-700")}>
            {stats.totalBudget - stats.totalActual >= 0 ? '✓ Hemat' : '⚠ Over'}
          </p>
          <h3 className={cn("text-lg font-bold mt-1", stats.totalBudget - stats.totalActual >= 0 ? "text-emerald-900" : "text-rose-900")}>
            {formatCurrency(Math.abs(stats.totalBudget - stats.totalActual))}
          </h3>
        </Card>
        <Card className={cn("p-4 border", stats.over > 0 ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100")}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest", stats.over > 0 ? "text-rose-700" : "text-text-muted")}>
            ⚠ Over Budget
          </p>
          <h3 className={cn("text-2xl font-bold mt-1", stats.over > 0 ? "text-rose-900" : "text-text-secondary")}>{stats.over}</h3>
        </Card>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'over_budget', 'warning', 'safe'] as const).map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
              filterStatus === st
                ? st === 'over_budget' ? "border-rose-600 bg-rose-50 text-rose-700"
                  : st === 'warning' ? "border-amber-600 bg-amber-50 text-amber-700"
                  : st === 'safe' ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-accent-dark bg-accent-dark/5"
                : "border-white/40 bg-white/40 text-text-secondary hover:bg-white/70")}
          >
            {st === 'all' ? `Semua (${stats.total})` :
             st === 'over_budget' ? `Over Budget (${stats.over})` :
             st === 'warning' ? `Hampir Over (${stats.warning})` :
             `Safe (${stats.safe})`}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input placeholder="Cari nama proyek..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-4 py-3 font-semibold">Proyek / RAB</TH>
              <TH className="px-4 py-3 font-semibold text-right">Budget RAB</TH>
              <TH className="px-4 py-3 font-semibold text-right">Aktual (PO)</TH>
              <TH className="px-4 py-3 font-semibold text-right">Selisih</TH>
              <TH className="px-4 py-3 font-semibold text-right">% Selisih</TH>
              <TH className="px-4 py-3 font-semibold text-center">Status</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={6} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : filtered.length === 0 ? (
              <TR><TD colSpan={6} className="px-6 py-10 text-center text-text-secondary">
                Tidak ada data RAB sesuai filter.
              </TD></TR>
            ) : (
              filtered.map(r => (
                <TR key={r.rab_project_id} className={cn("hover:bg-white/30 transition-colors",
                  r.status === 'over_budget' && "bg-rose-50/30",
                  r.status === 'warning' && "bg-amber-50/30")}>
                  <TD className="px-4 py-3 text-sm font-bold text-text-primary">{r.project_name}</TD>
                  <TD className="px-4 py-3 text-sm font-bold text-blue-700 text-right">{formatCurrency(r.budget)}</TD>
                  <TD className="px-4 py-3 text-sm font-bold text-violet-700 text-right">{formatCurrency(r.actual)}</TD>
                  <TD className={cn("px-4 py-3 text-sm font-bold text-right",
                    r.variance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {r.variance >= 0 ? '+' : ''} {formatCurrency(r.variance)}
                  </TD>
                  <TD className={cn("px-4 py-3 text-sm font-bold text-right flex items-center justify-end gap-1",
                    r.variance_percent >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {r.variance_percent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {r.variance_percent.toFixed(1)}%
                  </TD>
                  <TD className="px-4 py-3 text-center">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      r.status === 'safe' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700')}>
                      {r.status === 'safe' ? <><CheckCircle className="w-3 h-3 mr-1" /> Safe</> :
                       r.status === 'warning' ? <><AlertTriangle className="w-3 h-3 mr-1" /> Warning</> :
                       <><AlertTriangle className="w-3 h-3 mr-1" /> Over</>}
                    </span>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-900">
          <strong>Catatan:</strong> Budget dihitung dari item RAB level 3 (volume × harga material). Aktual dihitung dari Purchase Order ber-status APPROVED/RECEIVED/COMPLETED.
          Status: <strong className="text-emerald-700">Safe</strong> = sisa budget &gt; 10%, <strong className="text-amber-700">Warning</strong> = sisa &lt; 10%, <strong className="text-rose-700">Over</strong> = aktual melebihi budget.
        </p>
      </Card>
    </div>
  );
};

export default AuditCostsPage;
