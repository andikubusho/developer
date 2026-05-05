import React, { useState, useEffect, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, History, ArrowLeft, Trash2, Download, X, AlertCircle, Calendar
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { api } from '../lib/api';

interface JournalRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  account_code: string | null;
  reference_no: string | null;
  entry_group_id: string | null;
  source_type: string | null;
  posted_at: string | null;
  created_at: string;
}

interface CoaOpt { code: string; name: string }

interface FormLine {
  account_code: string;
  debit: string;        // string for input
  credit: string;
}

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatCode = (code: string | null): string => {
  if (!code || code.length !== 7) return code || '';
  return `${code[0]}-${code.slice(1,3)}-${code.slice(3,5)}-${code.slice(5,7)}`;
};

const GeneralJournalPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [coaOptions, setCoaOptions] = useState<CoaOpt[]>([]);
  const [coaMap, setCoaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reference_no: '',
    description: '',
    lines: [
      { account_code: '', debit: '', credit: '' },
      { account_code: '', debit: '', credit: '' },
    ] as FormLine[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [j, c] = await Promise.all([
        api.get('general_journal', 'select=*&order=date.desc,created_at.desc'),
        api.get('chart_of_accounts',
          'select=code,name&is_postable=eq.true&is_active=eq.true&order=code.asc'),
      ]);
      setRows(j || []);
      setCoaOptions(c || []);
      const m: Record<string, string> = {};
      (c || []).forEach((x: any) => { m[x.code] = x.name; });
      setCoaMap(m);
    } finally {
      setLoading(false);
    }
  };

  // Group flat rows by entry_group_id (rows tanpa group_id dianggap standalone single-row)
  const groupedRows = useMemo(() => {
    const groups: Record<string, JournalRow[]> = {};
    rows.forEach(r => {
      const k = r.entry_group_id || `single-${r.id}`;
      (groups[k] ||= []).push(r);
    });
    return Object.entries(groups).map(([gid, lines]) => ({
      group_id: gid,
      date: lines[0].date,
      description: lines[0].description,
      reference_no: lines[0].reference_no,
      lines,
      total_debit: lines.reduce((s, l) => s + Number(l.debit || 0), 0),
      total_credit: lines.reduce((s, l) => s + Number(l.credit || 0), 0),
      created_at: lines[0].created_at,
    })).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return groupedRows.filter(g => {
      if (filterMonth && !g.date.startsWith(filterMonth)) return false;
      if (s) {
        const haystack = `${g.description || ''} ${g.reference_no || ''}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [groupedRows, searchTerm, filterMonth]);

  // Form helpers
  const addLine = () => {
    setForm(p => ({ ...p, lines: [...p.lines, { account_code: '', debit: '', credit: '' }] }));
  };
  const removeLine = (idx: number) => {
    setForm(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
  };
  const updateLine = (idx: number, patch: Partial<FormLine>) => {
    setForm(p => ({
      ...p,
      lines: p.lines.map((l, i) => i === idx ? { ...l, ...patch } : l),
    }));
  };

  const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      reference_no: '',
      description: '',
      lines: [
        { account_code: '', debit: '', credit: '' },
        { account_code: '', debit: '', credit: '' },
      ],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { alert('Deskripsi wajib diisi'); return; }
    if (!isBalanced) { alert('Total Debit harus sama dengan Total Credit dan > 0'); return; }
    const validLines = form.lines.filter(l => l.account_code && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) { alert('Minimal 2 baris dengan akun & nominal'); return; }
    for (const l of validLines) {
      if (Number(l.debit) > 0 && Number(l.credit) > 0) {
        alert('Setiap baris hanya boleh debit ATAU credit, tidak boleh keduanya'); return;
      }
    }

    setSubmitting(true);
    try {
      const groupId = uuid();
      const payload = validLines.map(l => ({
        date: form.date,
        description: form.description.trim(),
        reference_no: form.reference_no || null,
        account_code: l.account_code,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        entry_group_id: groupId,
        source_type: 'manual',
      }));
      // Insert all lines (Supabase REST accepts array)
      await api.insert('general_journal', payload);
      setIsModalOpen(false);
      resetForm();
      await fetchAll();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group: typeof groupedRows[0]) => {
    if (!confirm(`Hapus jurnal "${group.description}" beserta ${group.lines.length} baris?`)) return;
    try {
      // Hapus semua row dengan entry_group_id sama
      if (group.group_id.startsWith('single-')) {
        await api.delete('general_journal', group.lines[0].id);
      } else {
        // Hapus by entry_group_id; lakukan satu per satu via id
        await Promise.all(group.lines.map(l => api.delete('general_journal', l.id)));
      }
      await fetchAll();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-text-secondary" />
              <h1 className="text-2xl font-bold text-text-primary">Jurnal Umum</h1>
            </div>
            <p className="text-text-secondary">Pencatatan transaksi double-entry</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Jurnal
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari deskripsi atau no. referensi..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-text-muted" />
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-xl border border-white/40 bg-white/40 text-sm font-medium text-text-secondary focus:outline-none w-[180px]"
            />
            {filterMonth && (
              <button onClick={() => setFilterMonth('')} className="absolute right-2 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] hover:bg-rose-100">✕</button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabel jurnal */}
      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-4 py-3 font-semibold">Tanggal</TH>
              <TH className="px-4 py-3 font-semibold">Ref</TH>
              <TH className="px-4 py-3 font-semibold">Deskripsi</TH>
              <TH className="px-4 py-3 font-semibold">Akun</TH>
              <TH className="px-4 py-3 font-semibold text-right">Debit</TH>
              <TH className="px-4 py-3 font-semibold text-right">Credit</TH>
              <TH className="px-4 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : filtered.length === 0 ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                Belum ada jurnal. Klik "Tambah Jurnal" untuk mulai.
              </TD></TR>
            ) : (
              filtered.flatMap((g) => [
                // Header row
                <TR key={`h-${g.group_id}`} className="bg-slate-50/60 border-t-2 border-slate-200">
                  <TD className="px-4 py-2 text-sm font-bold text-text-primary">{formatDate(g.date)}</TD>
                  <TD className="px-4 py-2 text-xs font-mono font-bold text-violet-700">{g.reference_no || '-'}</TD>
                  <TD className="px-4 py-2 text-sm font-bold text-text-primary" colSpan={2}>{g.description}</TD>
                  <TD className="px-4 py-2 text-sm font-bold text-emerald-700 text-right">{formatCurrency(g.total_debit)}</TD>
                  <TD className="px-4 py-2 text-sm font-bold text-rose-700 text-right">{formatCurrency(g.total_credit)}</TD>
                  <TD className="px-4 py-2 text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(g)} title="Hapus jurnal">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TD>
                </TR>,
                // Detail lines
                ...g.lines.map((l) => (
                  <TR key={l.id} className="hover:bg-white/30 transition-colors">
                    <TD className="px-4 py-2"></TD>
                    <TD className="px-4 py-2"></TD>
                    <TD className="px-4 py-2"></TD>
                    <TD className="px-4 py-2 text-xs">
                      <span className="font-mono font-bold text-text-secondary">{formatCode(l.account_code)}</span>
                      <span className="ml-2 text-text-secondary">{l.account_code ? coaMap[l.account_code] || '' : ''}</span>
                    </TD>
                    <TD className="px-4 py-2 text-sm text-right text-emerald-600 font-medium">{Number(l.debit) > 0 ? formatCurrency(Number(l.debit)) : '-'}</TD>
                    <TD className="px-4 py-2 text-sm text-right text-rose-600 font-medium">{Number(l.credit) > 0 ? formatCurrency(Number(l.credit)) : '-'}</TD>
                    <TD className="px-4 py-2"></TD>
                  </TR>
                ))
              ])
            )}
          </TBody>
        </Table>
      </Card>

      {/* Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Jurnal Umum" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Tanggal" type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} required />
            <Input label="No. Referensi" placeholder="JV-2026-001"
              value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} />
            <div className={cn(
              "rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center",
              isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            )}>
              {isBalanced
                ? `✓ Balanced (${formatCurrency(totalDebit)})`
                : `Selisih: ${formatCurrency(totalDebit - totalCredit)}`}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              required
              placeholder="Mis. Pembayaran sewa kantor bulan Mei 2026"
              className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none"
            />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Detail Jurnal</label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Baris
              </Button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-bold text-text-muted uppercase tracking-widest text-[10px]">Akun</th>
                    <th className="px-2 py-2 text-right font-bold text-text-muted uppercase tracking-widest text-[10px]">Debit</th>
                    <th className="px-2 py-2 text-right font-bold text-text-muted uppercase tracking-widest text-[10px]">Credit</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <select
                          value={line.account_code}
                          onChange={e => updateLine(idx, { account_code: e.target.value })}
                          className="w-full h-9 px-2 text-xs rounded border border-slate-200 focus:outline-none bg-white"
                        >
                          <option value="">— Pilih akun —</option>
                          {coaOptions.map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={line.debit}
                          onChange={e => updateLine(idx, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
                          className="w-full h-9 px-2 text-xs text-right rounded border border-slate-200 focus:outline-none focus:border-emerald-400"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={line.credit}
                          onChange={e => updateLine(idx, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
                          className="w-full h-9 px-2 text-xs text-right rounded border border-slate-200 focus:outline-none focus:border-rose-400"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {form.lines.length > 2 && (
                          <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 hover:bg-rose-50 rounded p-1">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-2 py-2 text-xs font-black uppercase tracking-widest text-text-muted">Total</td>
                    <td className="px-2 py-2 text-xs text-right font-bold text-emerald-700">{formatCurrency(totalDebit)}</td>
                    <td className="px-2 py-2 text-xs text-right font-bold text-rose-700">{formatCurrency(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isBalanced && totalDebit + totalCredit > 0 && (
              <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Total Debit & Credit harus sama. Selisih saat ini: {formatCurrency(totalDebit - totalCredit)}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting} disabled={!isBalanced}>Simpan Jurnal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GeneralJournalPage;
