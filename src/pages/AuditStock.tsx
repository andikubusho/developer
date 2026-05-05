import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  Search, Package, ArrowLeft, AlertTriangle, CheckCircle, RefreshCw, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface StockAuditRow {
  material_id: string;
  material_name: string;
  unit: string;
  code: string;
  current_stock: number;          // dari materials.stock
  min_stock: number;
  total_received: number;         // sum goods_receipts.qty per material
  total_used: number;             // sum material_usage.qty per material
  expected_stock: number;         // total_received - total_used
  variance: number;               // current - expected
  status: 'match' | 'mismatch' | 'low_stock';
}

const AuditStockPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StockAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'match' | 'mismatch' | 'low_stock'>('all');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [materials, receipts, usages] = await Promise.all([
        api.get('materials', 'select=id,name,unit,code,stock,min_stock&order=name.asc'),
        api.get('goods_receipts', 'select=material_id,qty'),
        api.get('material_usage', 'select=material_id,qty'),
      ]);

      const receivedMap: Record<string, number> = {};
      (receipts || []).forEach((r: any) => {
        if (!r.material_id) return;
        receivedMap[r.material_id] = (receivedMap[r.material_id] || 0) + (Number(r.qty) || 0);
      });
      const usedMap: Record<string, number> = {};
      (usages || []).forEach((u: any) => {
        if (!u.material_id) return;
        usedMap[u.material_id] = (usedMap[u.material_id] || 0) + (Number(u.qty) || 0);
      });

      const built: StockAuditRow[] = (materials || []).map((m: any) => {
        const current = Number(m.stock) || 0;
        const min = Number(m.min_stock) || 0;
        const received = receivedMap[m.id] || 0;
        const used = usedMap[m.id] || 0;
        const expected = received - used;
        const variance = current - expected;
        let status: 'match' | 'mismatch' | 'low_stock' = 'match';
        if (Math.abs(variance) > 0.01) status = 'mismatch';
        else if (current < min && min > 0) status = 'low_stock';
        return {
          material_id: m.id,
          material_name: m.name || '-',
          unit: m.unit || '-',
          code: m.code || '-',
          current_stock: current,
          min_stock: min,
          total_received: received,
          total_used: used,
          expected_stock: expected,
          variance,
          status,
        };
      });

      built.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
      setRows(built);
    } catch (err) {
      console.error('Audit stock fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (s && !`${r.material_name} ${r.code}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      match: rows.filter(r => r.status === 'match').length,
      mismatch: rows.filter(r => r.status === 'mismatch').length,
      lowStock: rows.filter(r => r.status === 'low_stock').length,
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
              <Package className="w-6 h-6 text-text-secondary" />
              <h1 className="text-2xl font-bold text-text-primary">Audit Stok Material</h1>
            </div>
            <p className="text-text-secondary">Cross-check stok sistem vs hitungan (Penerimaan - Pemakaian)</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setFilterStatus('all')}
          className={cn("text-left p-4 rounded-xl border-2 transition-all", filterStatus === 'all' ? "border-accent-dark bg-accent-dark/5" : "border-white/40 bg-white/40 hover:bg-white/70")}>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Material</p>
          <h3 className="text-2xl font-bold text-text-primary mt-1">{stats.total}</h3>
        </button>
        <button onClick={() => setFilterStatus('match')}
          className={cn("text-left p-4 rounded-xl border-2 transition-all", filterStatus === 'match' ? "border-emerald-600 bg-emerald-50" : "border-white/40 bg-white/40 hover:bg-white/70")}>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">✓ Match</p>
          <h3 className="text-2xl font-bold text-emerald-900 mt-1">{stats.match}</h3>
        </button>
        <button onClick={() => setFilterStatus('mismatch')}
          className={cn("text-left p-4 rounded-xl border-2 transition-all", filterStatus === 'mismatch' ? "border-rose-600 bg-rose-50" : "border-white/40 bg-white/40 hover:bg-white/70")}>
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">⚠ Selisih</p>
          <h3 className="text-2xl font-bold text-rose-900 mt-1">{stats.mismatch}</h3>
        </button>
        <button onClick={() => setFilterStatus('low_stock')}
          className={cn("text-left p-4 rounded-xl border-2 transition-all", filterStatus === 'low_stock' ? "border-amber-600 bg-amber-50" : "border-white/40 bg-white/40 hover:bg-white/70")}>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">⚠ Stok Rendah</p>
          <h3 className="text-2xl font-bold text-amber-900 mt-1">{stats.lowStock}</h3>
        </button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari nama atau kode material..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {filterStatus !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setFilterStatus('all')}>
              <X className="w-4 h-4 mr-1" /> Reset Filter
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[1000px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-4 py-3 font-semibold">Kode</TH>
              <TH className="px-4 py-3 font-semibold">Material</TH>
              <TH className="px-4 py-3 font-semibold text-right">Stok Sistem</TH>
              <TH className="px-4 py-3 font-semibold text-right">Penerimaan</TH>
              <TH className="px-4 py-3 font-semibold text-right">Pemakaian</TH>
              <TH className="px-4 py-3 font-semibold text-right">Stok Seharusnya</TH>
              <TH className="px-4 py-3 font-semibold text-right">Selisih</TH>
              <TH className="px-4 py-3 font-semibold text-center">Status</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={8} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : filtered.length === 0 ? (
              <TR><TD colSpan={8} className="px-6 py-10 text-center text-text-secondary">
                Tidak ada material sesuai filter.
              </TD></TR>
            ) : (
              filtered.map(r => (
                <TR key={r.material_id} className={cn("hover:bg-white/30 transition-colors",
                  r.status === 'mismatch' && "bg-rose-50/30",
                  r.status === 'low_stock' && "bg-amber-50/30")}>
                  <TD className="px-4 py-3 text-xs font-mono font-bold text-text-secondary">{r.code}</TD>
                  <TD className="px-4 py-3 text-sm font-medium text-text-primary">
                    {r.material_name}
                    {r.min_stock > 0 && <span className="text-[10px] text-text-muted ml-2">(min: {r.min_stock} {r.unit})</span>}
                  </TD>
                  <TD className="px-4 py-3 text-sm font-bold text-text-primary text-right">{r.current_stock} {r.unit}</TD>
                  <TD className="px-4 py-3 text-sm text-emerald-600 text-right">+{r.total_received}</TD>
                  <TD className="px-4 py-3 text-sm text-rose-600 text-right">-{r.total_used}</TD>
                  <TD className="px-4 py-3 text-sm font-bold text-text-secondary text-right">{r.expected_stock} {r.unit}</TD>
                  <TD className={cn("px-4 py-3 text-sm font-bold text-right",
                    r.variance === 0 ? "text-emerald-600" :
                    r.variance > 0 ? "text-amber-600" : "text-rose-600")}>
                    {r.variance > 0 ? '+' : ''}{r.variance.toFixed(2)}
                  </TD>
                  <TD className="px-4 py-3 text-center">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      r.status === 'match' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'mismatch' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700')}>
                      {r.status === 'match' ? <><CheckCircle className="w-3 h-3 mr-1" /> Match</> :
                       r.status === 'mismatch' ? <><AlertTriangle className="w-3 h-3 mr-1" /> Selisih</> :
                       <><AlertTriangle className="w-3 h-3 mr-1" /> Stok Rendah</>}
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
          <strong>Catatan:</strong> Audit stok hitung selisih dengan formula: <code>Stok Sistem - (Total Penerimaan - Total Pemakaian)</code>.
          Selisih bukan nol = ada transaksi tidak ter-record (manual adjustment, opname belum disinkron, atau data lama sebelum tracking dimulai).
        </p>
      </Card>
    </div>
  );
};

export default AuditStockPage;
