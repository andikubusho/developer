import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, ArrowLeft, Edit, Trash2, BookOpen,
  ChevronRight, ChevronDown, X
} from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'other_income' | 'other_expense';
type NormalBalance = 'debit' | 'credit';

interface CoaItem {
  id: string;
  code: string;             // 7 digit
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_id: string | null;
  level: number;
  is_postable: boolean;
  is_active: boolean;
  is_system: boolean;
  description: string | null;
}

interface FormState {
  code: string;
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_id: string;        // '' = root
  level: number;
  is_postable: boolean;
  is_active: boolean;
  description: string;
}

const TYPE_META: Record<AccountType, { label: string; badge: string; defaultBalance: NormalBalance }> = {
  asset:         { label: 'Aset',                 badge: 'bg-blue-100 text-blue-700 border-blue-200',         defaultBalance: 'debit'  },
  liability:     { label: 'Liabilitas',           badge: 'bg-orange-100 text-orange-700 border-orange-200',   defaultBalance: 'credit' },
  equity:        { label: 'Ekuitas',              badge: 'bg-purple-100 text-purple-700 border-purple-200',   defaultBalance: 'credit' },
  revenue:       { label: 'Pendapatan',           badge: 'bg-green-100 text-green-700 border-green-200',      defaultBalance: 'credit' },
  expense:       { label: 'Beban',                badge: 'bg-red-100 text-red-700 border-red-200',            defaultBalance: 'debit'  },
  other_income:  { label: 'Pendapatan Lain',      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',defaultBalance: 'credit' },
  other_expense: { label: 'Biaya Lain',           badge: 'bg-rose-100 text-rose-700 border-rose-200',         defaultBalance: 'debit'  },
};

const ALL_TYPES: AccountType[] = ['asset','liability','equity','revenue','expense','other_income','other_expense'];

// Format kode 7-digit: "1110001" → "1-11-10-001"
const formatCode = (code: string): string => {
  if (!code || code.length !== 7) return code;
  return `${code[0]}-${code.slice(1,3)}-${code.slice(3,5)}-${code.slice(5,7)}`;
};

const emptyForm: FormState = {
  code: '',
  name: '',
  account_type: 'asset',
  normal_balance: 'debit',
  parent_id: '',
  level: 5,
  is_postable: true,
  is_active: true,
  description: '',
};

const MasterAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<CoaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await api.get('chart_of_accounts', 'select=*&order=code.asc');
      setAccounts(data || []);
    } catch (err) {
      console.error('Fetch CoA Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build map id → children
  const childrenMap = useMemo(() => {
    const m: Record<string, CoaItem[]> = {};
    accounts.forEach(a => {
      const k = a.parent_id || 'root';
      (m[k] ||= []).push(a);
    });
    return m;
  }, [accounts]);

  // Build flat list yang sudah di-sort dan di-indent sesuai hierarki, plus filtering
  const visibleRows = useMemo(() => {
    const result: CoaItem[] = [];
    const search = searchTerm.toLowerCase().trim();

    const matches = (a: CoaItem) => {
      if (filterType !== 'all' && a.account_type !== filterType) return false;
      if (!showInactive && !a.is_active) return false;
      if (search) {
        const haystack = `${a.code} ${a.name}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    };

    // DFS order based on hierarchy; saat ada search/filter, kita tetap pakai order kode tapi
    // sembunyikan baris yang tidak match. Untuk menjaga konteks header, jika anak match maka parent ditampilkan.
    if (search || filterType !== 'all' || !showInactive) {
      // Cari semua row yang match, lalu include semua ancestor-nya
      const idById: Record<string, CoaItem> = {};
      accounts.forEach(a => { idById[a.id] = a; });
      const include = new Set<string>();
      accounts.forEach(a => {
        if (matches(a)) {
          let cur: CoaItem | undefined = a;
          while (cur) {
            include.add(cur.id);
            cur = cur.parent_id ? idById[cur.parent_id] : undefined;
          }
        }
      });
      // Output dalam urutan code asc, hanya yg include
      accounts.forEach(a => {
        if (include.has(a.id)) {
          // Hormati collapsed: kalau salah satu ancestor di-collapse, skip
          let cur: CoaItem | undefined = a;
          let hidden = false;
          while (cur && cur.parent_id) {
            if (collapsed.has(cur.parent_id)) { hidden = true; break; }
            cur = idById[cur.parent_id];
          }
          if (!hidden) result.push(a);
        }
      });
    } else {
      // Mode normal: DFS dari root, hormati collapsed
      const dfs = (parentId: string | null) => {
        const list = childrenMap[parentId || 'root'] || [];
        list.sort((a, b) => a.code.localeCompare(b.code));
        for (const node of list) {
          result.push(node);
          if (!collapsed.has(node.id)) dfs(node.id);
        }
      };
      dfs(null);
    }
    return result;
  }, [accounts, childrenMap, collapsed, searchTerm, filterType, showInactive]);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // === Modal CRUD ===
  const openCreate = (parent?: CoaItem) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      parent_id: parent?.id || '',
      account_type: parent?.account_type || 'asset',
      normal_balance: parent ? TYPE_META[parent.account_type].defaultBalance : 'debit',
      level: parent ? Math.min(parent.level + 1, 5) : 1,
      is_postable: parent ? (parent.level + 1) >= 5 : false,
    });
    setModalOpen(true);
  };

  const openEdit = (a: CoaItem) => {
    setEditingId(a.id);
    setForm({
      code: a.code,
      name: a.name,
      account_type: a.account_type,
      normal_balance: a.normal_balance,
      parent_id: a.parent_id || '',
      level: a.level,
      is_postable: a.is_postable,
      is_active: a.is_active,
      description: a.description || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{7}$/.test(form.code)) { alert('Kode harus 7 digit angka'); return; }
    if (!form.name.trim()) { alert('Nama akun wajib diisi'); return; }

    setSubmitting(true);
    try {
      const payload: any = {
        code: form.code,
        name: form.name.trim(),
        account_type: form.account_type,
        normal_balance: form.normal_balance,
        parent_id: form.parent_id || null,
        level: form.level,
        is_postable: form.is_postable,
        is_active: form.is_active,
        description: form.description || null,
      };

      if (editingId) {
        await api.update('chart_of_accounts', editingId, payload);
      } else {
        await api.insert('chart_of_accounts', payload);
      }
      setModalOpen(false);
      await fetchAccounts();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (a: CoaItem) => {
    if (a.is_system) { alert('Akun sistem tidak boleh dihapus.'); return; }
    const hasChildren = (childrenMap[a.id] || []).length > 0;
    if (hasChildren) { alert('Tidak bisa dihapus: masih punya akun anak. Hapus anaknya dulu.'); return; }
    if (!confirm(`Hapus akun "${a.code} - ${a.name}"?\nPastikan akun ini belum dipakai di jurnal.`)) return;
    try {
      await api.delete('chart_of_accounts', a.id);
      await fetchAccounts();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}\n\nKalau akun sudah dipakai di jurnal, gunakan toggle "Aktif" untuk menonaktifkan.`);
    }
  };

  // Saat tipe akun diganti, set saldo normal default
  const handleTypeChange = (newType: AccountType) => {
    setForm(prev => ({ ...prev, account_type: newType, normal_balance: TYPE_META[newType].defaultBalance }));
  };

  // Opsi parent untuk dropdown: tipe sama, level < 5, bukan diri sendiri
  const parentOptions = useMemo(() => {
    return accounts.filter(a =>
      a.account_type === form.account_type &&
      a.level < 5 &&
      a.id !== editingId
    ).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, form.account_type, editingId]);

  // Statistik
  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    accounts.forEach(a => { byType[a.account_type] = (byType[a.account_type] || 0) + 1; });
    return byType;
  }, [accounts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2 h-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-text-secondary" />
              <h1 className="text-2xl font-bold text-text-primary">Master Akun</h1>
            </div>
            <p className="text-text-secondary">Bagan Akun (Chart of Accounts) — Format 7 Digit</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Akun
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {ALL_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(prev => prev === t ? 'all' : t)}
            className={cn(
              "p-3 rounded-xl border-2 text-left transition-all",
              filterType === t ? "border-accent-dark bg-accent-dark/5 shadow-sm" : "border-white/40 bg-white/40 hover:bg-white/70"
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{TYPE_META[t].label}</p>
            <p className="text-xl font-bold text-text-primary mt-1">{stats[t] || 0}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari kode atau nama akun..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/40 bg-white/40 cursor-pointer hover:bg-white text-sm font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="accent-accent-dark"
            />
            Tampilkan tidak aktif
          </label>
          {filterType !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setFilterType('all')}>
              <X className="w-4 h-4 mr-1" /> Filter: {TYPE_META[filterType].label}
            </Button>
          )}
        </div>
      </Card>

      {/* Tabel Hierarki */}
      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[900px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-4 py-3 font-semibold">Kode</TH>
              <TH className="px-4 py-3 font-semibold">Nama Akun</TH>
              <TH className="px-4 py-3 font-semibold">Tipe</TH>
              <TH className="px-4 py-3 font-semibold text-center">Saldo Normal</TH>
              <TH className="px-4 py-3 font-semibold text-center">Postable</TH>
              <TH className="px-4 py-3 font-semibold text-center">Aktif</TH>
              <TH className="px-4 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : visibleRows.length === 0 ? (
              <TR><TD colSpan={7} className="px-6 py-10 text-center text-text-secondary">
                {accounts.length === 0
                  ? 'Belum ada akun. Jalankan migrasi add_chart_of_accounts.sql di Supabase untuk seed data awal.'
                  : 'Tidak ada akun yang cocok dengan filter.'}
              </TD></TR>
            ) : (
              visibleRows.map(a => {
                const hasChildren = (childrenMap[a.id] || []).length > 0;
                const isCollapsed = collapsed.has(a.id);
                const indent = (a.level - 1) * 18;
                return (
                  <TR key={a.id} className={cn(
                    "hover:bg-white/30 transition-colors",
                    !a.is_active && "opacity-50",
                    !a.is_postable && "bg-slate-50/50 font-bold"
                  )}>
                    <TD className="px-4 py-3 text-xs font-mono font-bold text-text-secondary whitespace-nowrap">
                      <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleCollapse(a.id)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100"
                          >
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="w-5 h-5" />
                        )}
                        <span>{formatCode(a.code)}</span>
                      </div>
                    </TD>
                    <TD className={cn("px-4 py-3 text-sm", !a.is_postable ? "font-bold text-text-primary uppercase" : "text-text-primary")}>
                      {a.name}
                      {a.is_system && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Sistem</span>}
                    </TD>
                    <TD className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase border", TYPE_META[a.account_type].badge)}>
                        {TYPE_META[a.account_type].label}
                      </span>
                    </TD>
                    <TD className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold",
                        a.normal_balance === 'debit' ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                      )}>
                        {a.normal_balance === 'debit' ? 'D' : 'K'}
                      </span>
                    </TD>
                    <TD className="px-4 py-3 text-center text-xs">
                      {a.is_postable ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-text-muted">—</span>}
                    </TD>
                    <TD className="px-4 py-3 text-center text-xs">
                      {a.is_active ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-rose-500">✕</span>}
                    </TD>
                    <TD className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.level < 5 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openCreate(a)} title="Tambah anak">
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(a)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!a.is_system && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(a)} title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>

      {/* Modal Tambah/Edit */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Akun' : 'Tambah Akun'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kode (7 digit)"
              placeholder="1110014"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.replace(/\D/g, '').slice(0, 7) })}
              required
            />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Tipe Akun</label>
              <select
                value={form.account_type}
                onChange={e => handleTypeChange(e.target.value as AccountType)}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              >
                {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
          </div>

          <Input
            label="Nama Akun"
            placeholder="Mis. Bank Permata"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Saldo Normal</label>
              <select
                value={form.normal_balance}
                onChange={e => setForm({ ...form, normal_balance: e.target.value as NormalBalance })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Level</label>
              <select
                value={form.level}
                onChange={e => setForm({ ...form, level: Number(e.target.value) })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
              >
                {[1,2,3,4,5].map(l => <option key={l} value={l}>{l}{l===5?' (Detail)':l===1?' (Header utama)':''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">&nbsp;</label>
              <label className="flex items-center gap-2 h-10 px-3 rounded-xl glass-input cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_postable}
                  onChange={e => setForm({ ...form, is_postable: e.target.checked })}
                  className="accent-accent-dark"
                />
                Bisa dijurnal (postable)
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Parent (Akun Induk)</label>
            <select
              value={form.parent_id}
              onChange={e => setForm({ ...form, parent_id: e.target.value })}
              className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">— (Tanpa parent / level 1) —</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {formatCode(p.code)} — {p.name} (L{p.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Deskripsi (Opsional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Catatan tambahan..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="accent-accent-dark"
            />
            Aktif (uncheck untuk menonaktifkan tanpa menghapus)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>{editingId ? 'Update' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterAccountPage;
