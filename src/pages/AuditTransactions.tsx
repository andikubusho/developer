import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, ShieldCheck, ArrowLeft, Download, AlertTriangle,
  CheckCircle, ArrowUpCircle, ArrowDownCircle, Calendar, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface AuditRow {
  id: string;
  date: string;
  source: 'cash_flow' | 'general_journal' | 'payment' | 'deposit';
  type: string;                  // 'in' | 'out' | 'debit' | 'credit'
  description: string;
  reference: string;
  amount: number;
  status: string;
  anomalies: string[];           // flag mencurigakan
}

const ANOMALY_COLORS: Record<string, string> = {
  'large': 'bg-amber-100 text-amber-700 border-amber-200',
  'unverified': 'bg-rose-100 text-rose-700 border-rose-200',
  'missing-ref': 'bg-orange-100 text-orange-700 border-orange-200',
  'duplicate': 'bg-red-100 text-red-700 border-red-200',
  'old-pending': 'bg-amber-100 text-amber-700 border-amber-200',
};

const ANOMALY_LABELS: Record<string, string> = {
  'large': 'Nominal Besar',
  'unverified': 'Belum Verifikasi',
  'missing-ref': 'Tanpa Referensi',
  'duplicate': 'Duplikat',
  'old-pending': 'Pending > 7 hari',
};

const LARGE_THRESHOLD = 50_000_000; // Rp 50 juta dianggap besar

const AuditTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterAnomaly, setFilterAnomaly] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cashFlow, journal, payments, deposits] = await Promise.all([
        api.get('cash_flow', 'select=id,date,type,description,category,amount,reference_type,status&order=date.desc&limit=500'),
        api.get('general_journal', 'select=id,date,description,reference_no,debit,credit,account_code&order=date.desc&limit=500'),
        api.get('payments', 'select=id,date,amount,payment_type,status&order=date.desc&limit=500'),
        api.get('deposits', 'select=id,date,amount,name,status&order=date.desc&limit=500'),
      ]);

      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Combine semua jadi 1 list
      const combined: AuditRow[] = [];

      (cashFlow || []).forEach((c: any) => {
        const anomalies: string[] = [];
        if (Number(c.amount) >= LARGE_THRESHOLD) anomalies.push('large');
        if (c.status !== 'verified') anomalies.push('unverified');
        combined.push({
          id: `cf-${c.id}`,
          date: c.date,
          source: 'cash_flow',
          type: c.type,
          description: c.description || c.category || '-',
          reference: c.reference_type || '-',
          amount: Number(c.amount) || 0,
          status: c.status || '-',
          anomalies,
        });
      });

      (journal || []).forEach((j: any) => {
        const anomalies: string[] = [];
        const total = Math.max(Number(j.debit) || 0, Number(j.credit) || 0);
        if (total >= LARGE_THRESHOLD) anomalies.push('large');
        if (!j.reference_no) anomalies.push('missing-ref');
        combined.push({
          id: `j-${j.id}`,
          date: j.date,
          source: 'general_journal',
          type: Number(j.debit) > 0 ? 'debit' : 'credit',
          description: j.description || '-',
          reference: j.reference_no || '-',
          amount: total,
          status: 'posted',
          anomalies,
        });
      });

      (payments || []).forEach((p: any) => {
        const anomalies: string[] = [];
        if (Number(p.amount) >= LARGE_THRESHOLD) anomalies.push('large');
        if (p.status === 'pending' && p.date && p.date < sevenDaysAgo) anomalies.push('old-pending');
        if (p.status !== 'verified') anomalies.push('unverified');
        combined.push({
          id: `p-${p.id}`,
          date: p.date,
          source: 'payment',
          type: p.payment_type || 'in',
          description: 'Pembayaran konsumen',
          reference: '-',
          amount: Number(p.amount) || 0,
          status: p.status || '-',
          anomalies,
        });
      });

      (deposits || []).forEach((d: any) => {
        const anomalies: string[] = [];
        if (Number(d.amount) >= LARGE_THRESHOLD) anomalies.push('large');
        if (d.status === 'pending' && d.date && d.date < sevenDaysAgo) anomalies.push('old-pending');
        combined.push({
          id: `d-${d.id}`,
          date: d.date,
          source: 'deposit',
          type: 'in',
          description: `Deposit: ${d.name || 'Tanpa Nama'}`,
          reference: '-',
          amount: Number(d.amount) || 0,
          status: d.status || '-',
          anomalies,
        });
      });

      // Deteksi duplikat (date + amount + source sama)
      const dupKey: Record<string, string[]> = {};
      combined.forEach(r => {
        const k = `${r.source}|${r.date}|${r.amount}`;
        (dupKey[k] ||= []).push(r.id);
      });
      Object.values(dupKey).forEach(ids => {
        if (ids.length > 1) {
          ids.forEach(id => {
            const r = combined.find(x => x.id === id);
            if (r && !r.anomalies.includes('duplicate')) r.anomalies.push('duplicate');
          });
        }
      });

      // Sort by date desc
      combined.sort((a, b) => (a.date < b.date ? 1 : -1));
      setRows(combined);
    } catch (err) {
      console.error('Audit fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return rows.filter(r => {
      if (filterSource !== 'all' && r.source !== filterSource) return false;
      if (filterAnomaly === 'has-anomaly' && r.anomalies.length === 0) return false;
      if (filterAnomaly !== 'all' && filterAnomaly !== 'has-anomaly' && !r.anomalies.includes(filterAnomaly)) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (s && !`${r.description} ${r.reference}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, searchTerm, filterSource, filterAnomaly, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = rows.length;
    const anomalyCount = rows.filter(r => r.anomalies.length > 0).length;
    const totalIn = rows.filter(r => r.type === 'in' || r.type === 'debit').reduce((s, r) => s + r.amount, 0);
    const totalOut = rows.filter(r => r.type === 'out' || r.type === 'credit').reduce((s, r) => s + r.amount, 0);
    return { total, anomalyCount, totalIn, totalOut };
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
              <ShieldCheck className="w-6 h-6 text-text-secondary" />
              <h1 className="text-2xl font-bold text-text-primary">Audit Transaksi</h1>
            </div>
            <p className="text-text-secondary">Cross-check transaksi keuangan & flag anomali</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Total Transaksi</p>
          <h3 className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</h3>
        </Card>
        <Card className={cn("p-4 border", stats.anomalyCount > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100")}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest", stats.anomalyCount > 0 ? "text-rose-700" : "text-emerald-700")}>
            {stats.anomalyCount > 0 ? '⚠ Perlu Diperiksa' : '✓ Clean'}
          </p>
          <h3 className={cn("text-2xl font-bold mt-1", stats.anomalyCount > 0 ? "text-rose-900" : "text-emerald-900")}>{stats.anomalyCount}</h3>
        </Card>
        <Card className="p-4 bg-emerald-50 border-emerald-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Masuk</p>
          <h3 className="text-lg font-bold text-emerald-900 mt-1">{formatCurrency(stats.totalIn)}</h3>
        </Card>
        <Card className="p-4 bg-rose-50 border-rose-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Total Keluar</p>
          <h3 className="text-lg font-bold text-rose-900 mt-1">{formatCurrency(stats.totalOut)}</h3>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input placeholder="Cari deskripsi/referensi..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="h-10 rounded-xl border border-white/40 bg-white/40 px-3 text-sm font-medium">
            <option value="all">Semua Sumber</option>
            <option value="cash_flow">Cash Flow</option>
            <option value="general_journal">Jurnal Umum</option>
            <option value="payment">Pembayaran</option>
            <option value="deposit">Deposit</option>
          </select>
          <select value={filterAnomaly} onChange={e => setFilterAnomaly(e.target.value)}
            className="h-10 rounded-xl border border-white/40 bg-white/40 px-3 text-sm font-medium">
            <option value="all">Semua</option>
            <option value="has-anomaly">⚠ Ada Anomali</option>
            <option value="large">Nominal Besar</option>
            <option value="unverified">Belum Verifikasi</option>
            <option value="duplicate">Duplikat</option>
            <option value="old-pending">Pending Lama</option>
            <option value="missing-ref">Tanpa Referensi</option>
          </select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs" />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-4 py-3 font-semibold">Tanggal</TH>
              <TH className="px-4 py-3 font-semibold">Sumber</TH>
              <TH className="px-4 py-3 font-semibold">Deskripsi</TH>
              <TH className="px-4 py-3 font-semibold">Ref</TH>
              <TH className="px-4 py-3 font-semibold text-right">Jumlah</TH>
              <TH className="px-4 py-3 font-semibold text-center">Status</TH>
              <TH className="px-4 py-3 font-semibold">Anomali</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : filtered.length === 0 ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                Tidak ada transaksi sesuai filter.
              </TD></TR>
            ) : (
              filtered.map(r => (
                <TR key={r.id} className={cn("hover:bg-white/30 transition-colors", r.anomalies.length > 0 && "bg-amber-50/30")}>
                  <TD className="px-4 py-3 text-sm text-text-secondary">{formatDate(r.date)}</TD>
                  <TD className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      r.source === 'cash_flow' ? 'bg-blue-100 text-blue-700' :
                      r.source === 'general_journal' ? 'bg-violet-100 text-violet-700' :
                      r.source === 'payment' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-cyan-100 text-cyan-700')}>
                      {r.source.replace('_', ' ')}
                    </span>
                  </TD>
                  <TD className="px-4 py-3 text-sm text-text-primary max-w-xs truncate">{r.description}</TD>
                  <TD className="px-4 py-3 text-xs font-mono text-text-muted">{r.reference}</TD>
                  <TD className={cn("px-4 py-3 text-sm font-bold text-right",
                    r.type === 'in' || r.type === 'debit' ? 'text-emerald-600' : 'text-rose-600')}>
                    {(r.type === 'in' || r.type === 'debit') ? '+' : '-'} {formatCurrency(r.amount)}
                  </TD>
                  <TD className="px-4 py-3 text-center">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      r.status === 'verified' || r.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600')}>
                      {r.status}
                    </span>
                  </TD>
                  <TD className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.anomalies.length === 0 ? (
                        <span className="text-emerald-600"><CheckCircle className="w-4 h-4" /></span>
                      ) : (
                        r.anomalies.map(a => (
                          <span key={a} className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border", ANOMALY_COLORS[a])}>
                            {ANOMALY_LABELS[a]}
                          </span>
                        ))
                      )}
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
};

export default AuditTransactionsPage;
