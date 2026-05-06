import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Filter, Search, Send, Eye, Sparkles, History,
  TrendingUp, FileCheck2, Clock, Zap
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface JournalLine {
  account_code: string;
  debit: number;
  credit: number;
  description?: string;
}

interface PendingEntry {
  id: string;
  source_type: string;
  source_id: string;
  reference_no: string;
  transaction_date: string;
  description: string;
  proposed_lines: JournalLine[];
  total_debit: number;
  total_credit: number;
  trigger_reason: string;
  previous_entry_group: string | null;
  status: string;
  detected_at: string;
  error_message?: string;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  payment:    { label: 'Pembayaran Konsumen',    color: 'bg-blue-100 text-blue-700' },
  deposit:    { label: 'Booking Fee / DP',       color: 'bg-cyan-100 text-cyan-700' },
  sale:       { label: 'Penjualan Unit',         color: 'bg-emerald-100 text-emerald-700' },
  kpr:        { label: 'KPR Cair',               color: 'bg-violet-100 text-violet-700' },
  sup_pay:    { label: 'Bayar Supplier',         color: 'bg-rose-100 text-rose-700' },
  gr:         { label: 'Penerimaan Barang',      color: 'bg-amber-100 text-amber-700' },
  opname_pay: { label: 'Bayar Opname Mandor',    color: 'bg-orange-100 text-orange-700' },
  mat_use:    { label: 'Pemakaian Material',     color: 'bg-yellow-100 text-yellow-700' },
  petty:      { label: 'Petty Cash',             color: 'bg-pink-100 text-pink-700' },
  payroll:    { label: 'Gaji Karyawan',          color: 'bg-indigo-100 text-indigo-700' },
  addon:      { label: 'Pekerjaan Tambahan',     color: 'bg-teal-100 text-teal-700' },
  transfer:   { label: 'Transfer Antar Akun',    color: 'bg-violet-100 text-violet-700' },
};

const AutoJournal: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<PendingEntry | null>(null);
  const [filter, setFilter] = useState({
    sourceType: '',
    status: 'pending',
    search: '',
    month: '' // format: YYYY-MM
  });
  const [stats, setStats] = useState({
    pending: 0,
    posted_today: 0,
    error_count: 0,
    total_value: 0
  });

  useEffect(() => {
    fetchData();
  }, [filter.status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = `select=*&order=detected_at.desc&limit=500`;
      if (filter.status) query += `&status=eq.${filter.status}`;

      const data = await api.get('journal_pending', query);
      setPending(data || []);

      // Stats
      const today = new Date().toISOString().split('T')[0];
      const [allPending, postedToday, errored] = await Promise.all([
        api.get('journal_pending', `select=total_debit&status=eq.pending`),
        api.get('journal_pending', `select=id&status=eq.posted&posted_at=gte.${today}`),
        api.get('journal_pending', `select=id&status=eq.error`)
      ]);

      setStats({
        pending: (allPending || []).length,
        posted_today: (postedToday || []).length,
        error_count: (errored || []).length,
        total_value: (allPending || []).reduce((s: number, p: any) => s + Number(p.total_debit || 0), 0)
      });
    } catch (err) {
      console.error('Error fetching pending journals:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return pending.filter(p => {
      if (filter.sourceType && p.source_type !== filter.sourceType) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!(p.reference_no || '').toLowerCase().includes(q) &&
            !(p.description || '').toLowerCase().includes(q)) return false;
      }
      if (filter.month) {
        const txMonth = (p.transaction_date || '').slice(0, 7); // YYYY-MM
        if (txMonth !== filter.month) return false;
      }
      return true;
    });
  }, [pending, filter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  const handlePost = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`Posting ${ids.length} entries ke General Journal?`)) return;

    setPosting(true);
    try {
      const result = await api.rpc('fn_post_journal_bulk', {
        p_pending_ids: ids,
        p_user_id: profile?.id || null
      });

      const successCount = (result || []).filter((r: any) => r.success).length;
      const errorCount = (result || []).filter((r: any) => !r.success).length;

      alert(`Posting selesai: ${successCount} sukses, ${errorCount} error`);
      setSelectedIds(new Set());
      fetchData();
    } catch (err: any) {
      alert(`Gagal posting: ${err.message}`);
    } finally {
      setPosting(false);
    }
  };

  const handleBackfill = async () => {
    if (!confirm('Jalankan backfill untuk semua transaksi yang belum dijurnal?\n\nIni akan men-staging semua data lama yang status final tapi belum punya jurnal.')) return;
    setBackfilling(true);
    try {
      const result = await api.rpc('fn_backfill_all_journals', {});
      const total = (result || []).reduce((s: number, r: any) => s + Number(r.total_processed || 0), 0);
      alert(`Backfill selesai: ${total} transaksi berhasil di-stage ke pending journal`);
      fetchData();
    } catch (err: any) {
      alert(`Gagal backfill: ${err.message}`);
    } finally {
      setBackfilling(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan staging journal ini? (Data tidak akan masuk ke General Journal)')) return;
    try {
      await api.update('journal_pending', id, { status: 'cancelled' });
      fetchData();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    }
  };

  const totalSelected = filtered
    .filter(p => selectedIds.has(p.id))
    .reduce((s, p) => s + Number(p.total_debit || 0), 0);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="w-14 h-14 rounded-3xl bg-white shadow-3d flex items-center justify-center hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-text-muted" />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-3">
              <Sparkles className="w-9 h-9 text-violet-500" />
              Jurnal Otomatis
            </h1>
            <p className="text-sm font-black text-text-muted uppercase tracking-[0.3em] mt-1 opacity-60">
              Staging & Posting Auto-Generated Entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleBackfill} isLoading={backfilling} className="rounded-2xl h-12 px-5 font-black uppercase text-xs tracking-widest">
            <Zap className="w-4 h-4 mr-2" /> Backfill Data Lama
          </Button>
          <Button onClick={fetchData} variant="ghost" className="rounded-2xl h-12 px-5 font-black uppercase text-xs tracking-widest">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-3d border-none">
          <Clock className="w-6 h-6 mb-2 opacity-70" />
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Pending</div>
          <div className="text-3xl font-black mt-1 italic">{stats.pending}</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-3d border-none">
          <FileCheck2 className="w-6 h-6 mb-2 opacity-70" />
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Posted Hari Ini</div>
          <div className="text-3xl font-black mt-1 italic">{stats.posted_today}</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-3d border-none">
          <AlertTriangle className="w-6 h-6 mb-2 opacity-70" />
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Error</div>
          <div className="text-3xl font-black mt-1 italic">{stats.error_count}</div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-3d border-none">
          <TrendingUp className="w-6 h-6 mb-2 opacity-70" />
          <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Nilai Pending</div>
          <div className="text-xl font-black mt-1 italic tracking-tighter">{formatCurrency(stats.total_value)}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-5 bg-white/60 backdrop-blur-xl border-white/60 shadow-3d">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari reference / deskripsi..."
              className="pl-10 h-11 border-none bg-slate-50/50"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>
          <select
            value={filter.sourceType}
            onChange={(e) => setFilter({ ...filter, sourceType: e.target.value })}
            className="h-11 rounded-xl border-none bg-slate-50/50 px-4 font-bold text-sm"
          >
            <option value="">Semua Jenis</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="h-11 rounded-xl border-none bg-slate-50/50 px-4 font-bold text-sm"
          >
            <option value="pending">⏳ Pending</option>
            <option value="posted">✅ Posted</option>
            <option value="error">❌ Error</option>
            <option value="cancelled">🚫 Cancelled</option>
            <option value="">Semua Status</option>
          </select>
          <Input
            type="month"
            placeholder="Pilih Bulan"
            value={filter.month}
            onChange={(e) => setFilter({ ...filter, month: e.target.value })}
            className="h-11 border-none bg-slate-50/50"
          />
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-4 bg-violet-50 border-violet-200 shadow-3d animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-black text-violet-700 uppercase tracking-widest">
                {selectedIds.size} entries terpilih
              </span>
              <span className="text-xs text-violet-500 font-bold">
                Total: {formatCurrency(totalSelected)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="rounded-xl text-xs">
                Batal Pilih
              </Button>
              <Button onClick={() => handlePost(Array.from(selectedIds))} isLoading={posting} className="rounded-xl bg-violet-600 hover:bg-violet-700 font-black text-xs uppercase tracking-widest">
                <Send className="w-4 h-4 mr-2" /> Posting Terpilih
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pending List */}
      <Card className="p-0 overflow-hidden bg-white shadow-premium border-none">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleSelectAll}
              className="w-5 h-5 rounded-md accent-violet-600"
              disabled={filter.status !== 'pending'}
            />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              {filtered.length} entries
            </span>
          </div>
          {filter.status === 'pending' && filtered.length > 0 && (
            <Button onClick={() => handlePost(filtered.map(p => p.id))} isLoading={posting} variant="outline" className="rounded-xl text-xs h-9">
              <Send className="w-3 h-3 mr-2" /> Posting Semua ({filtered.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-500" />
            <div className="mt-3 text-sm text-text-muted font-bold">Memuat data...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-text-muted">
            <FileCheck2 className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <div className="text-sm font-bold">Tidak ada entries</div>
            <div className="text-xs mt-1 opacity-60">Coba ubah filter atau klik "Backfill Data Lama"</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((entry) => {
              const meta = SOURCE_LABELS[entry.source_type] || { label: entry.source_type, color: 'bg-slate-100 text-slate-700' };
              const isEdit = entry.trigger_reason === 'edit_after_post';
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 transition-colors',
                    selectedIds.has(entry.id) ? 'bg-violet-50' : 'hover:bg-slate-50'
                  )}
                >
                  {filter.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      className="w-5 h-5 rounded-md accent-violet-600 shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest', meta.color)}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-black text-slate-400">{entry.reference_no}</span>
                      {isEdit && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-black uppercase">
                          ⚠️ EDITED
                        </span>
                      )}
                      {entry.status === 'error' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                          ERROR
                        </span>
                      )}
                      {entry.status === 'posted' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                          POSTED
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-1 truncate">{entry.description}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(entry.transaction_date)}</div>
                    {entry.error_message && (
                      <div className="text-[10px] text-rose-600 mt-1 italic">{entry.error_message}</div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-slate-900">{formatCurrency(entry.total_debit)}</div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                      {entry.proposed_lines?.length || 0} lines
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setViewing(entry)} className="p-2 rounded-lg text-sky-600 hover:bg-sky-50" title="Detail">
                      <Eye className="w-4 h-4" />
                    </button>
                    {entry.status === 'pending' && (
                      <>
                        <button onClick={() => handlePost([entry.id])} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Posting">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleCancel(entry.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50" title="Batalkan">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Detail Jurnal" size="3xl">
        {viewing && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference</div>
                <div className="font-black text-slate-900">{viewing.reference_no}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal</div>
                <div className="font-black text-slate-900">{formatDate(viewing.transaction_date)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deskripsi</div>
                <div className="font-bold text-slate-700">{viewing.description}</div>
              </div>
            </div>

            <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Akun</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Keterangan</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Debit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewing.proposed_lines || []).map((line, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-black text-slate-700">{line.account_code}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{line.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white">
                    <td colSpan={2} className="px-4 py-3 font-black uppercase text-[10px] tracking-widest">Total</td>
                    <td className="px-4 py-3 text-right font-black">{formatCurrency(viewing.total_debit)}</td>
                    <td className="px-4 py-3 text-right font-black">{formatCurrency(viewing.total_credit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {viewing.status === 'pending' && (
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setViewing(null)}>Tutup</Button>
                <Button onClick={() => { handlePost([viewing.id]); setViewing(null); }} className="bg-violet-600 hover:bg-violet-700">
                  <Send className="w-4 h-4 mr-2" /> Posting Sekarang
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AutoJournal;
