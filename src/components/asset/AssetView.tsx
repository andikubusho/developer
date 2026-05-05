import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit, Trash2, Eye, ArrowLeftRight, Wrench, Boxes,
  ClipboardCheck, X, AlertCircle, Calendar, RefreshCw
} from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD } from '../ui/Table';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { api } from '../../lib/api';
import {
  Asset, AssetClass, AssetCondition, AssetStatus,
  TOOL_CATEGORIES, FIXED_ASSET_CATEGORIES, CONDITION_LABELS, STATUS_LABELS,
  generateAssetCode, recordMovement, generateDepreciationSchedule, getBookValue,
  formatPeriod
} from '../../lib/asset';

interface ProjectOpt { id: string; name: string }
interface UserOpt { id: number; display_name: string; username: string }
interface CoaOpt { code: string; name: string; account_type: string }

export interface AssetViewProps {
  defaultClass: AssetClass;     // 'tool' | 'fixed_asset'
  pageTitle: string;
  pageSubtitle: string;
  accentColor?: 'amber' | 'indigo';
}

// Saldo normal helper untuk dropdown CoA
const COA_FILTER: Record<string, string> = {
  asset_coa: '?select=code,name,account_type&account_type=eq.asset&is_postable=eq.true&is_active=eq.true&order=code.asc',
  accum_depr: '?select=code,name,account_type&code=like.129%25&is_postable=eq.true&is_active=eq.true&order=code.asc',
  depr_expense: '?select=code,name,account_type&code=like.624%25&is_postable=eq.true&is_active=eq.true&order=code.asc',
};

const emptyForm = {
  asset_code: '',
  name: '',
  asset_class: 'tool' as AssetClass,
  category: '',
  serial_number: '',
  brand: '',
  model: '',
  acquisition_date: new Date().toISOString().split('T')[0],
  acquisition_cost: '',
  supplier_name: '',
  current_location: 'Gudang Pusat',
  current_holder_user_id: '',
  current_project_id: '',
  condition: 'baik' as AssetCondition,
  status: 'aktif' as AssetStatus,
  // fixed asset
  salvage_value: '',
  useful_life_months: '',
  depreciation_method: 'straight_line' as 'straight_line' | 'none',
  asset_coa_code: '',
  accum_depr_coa_code: '',
  depr_expense_coa_code: '',
  // tool
  is_consumable: false,
  notes: '',
};

const AssetView: React.FC<AssetViewProps> = ({ defaultClass, pageTitle, pageSubtitle, accentColor = 'indigo' }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [coaAsset, setCoaAsset] = useState<CoaOpt[]>([]);
  const [coaAccum, setCoaAccum] = useState<CoaOpt[]>([]);
  const [coaDepr, setCoaDepr] = useState<CoaOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Mutation modal (assign / return / transfer / maintain / dispose)
  const [mutOpen, setMutOpen] = useState(false);
  const [mutType, setMutType] = useState<'assign'|'return'|'transfer'|'maintain'|'dispose'|'reclassify'>('assign');
  const [mutAsset, setMutAsset] = useState<Asset | null>(null);
  const [mutForm, setMutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    to_location: '',
    to_holder_user_id: '',
    to_project_id: '',
    to_condition: 'baik' as AssetCondition,
    cost: '',
    notes: '',
    // reclassify-specific
    salvage_value: '',
    useful_life_months: '',
    depreciation_method: 'straight_line' as 'straight_line' | 'none',
    asset_coa_code: '',
    accum_depr_coa_code: '',
    depr_expense_coa_code: '',
  });
  const [mutating, setMutating] = useState(false);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [detailMovements, setDetailMovements] = useState<any[]>([]);
  const [detailDepreciation, setDetailDepreciation] = useState<any[]>([]);
  const [detailBookValue, setDetailBookValue] = useState<any>(null);

  // Opname modal
  const [opnameOpen, setOpnameOpen] = useState(false);

  useEffect(() => { fetchAll(); }, [defaultClass]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [assetData, projData, userData, coaA, coaAd, coaDe] = await Promise.all([
        api.get('assets', `select=*&asset_class=eq.${defaultClass}&order=asset_code.desc`),
        api.get('projects', 'select=id,name&order=name.asc'),
        api.get('users', 'select=id,username,display_name&order=display_name.asc'),
        api.get('chart_of_accounts', 'select=code,name,account_type&account_type=eq.asset&is_postable=eq.true&is_active=eq.true&order=code.asc'),
        api.get('chart_of_accounts', 'select=code,name,account_type&code=like.129%25&is_postable=eq.true&is_active=eq.true&order=code.asc'),
        api.get('chart_of_accounts', 'select=code,name,account_type&code=like.624%25&is_postable=eq.true&is_active=eq.true&order=code.asc'),
      ]);
      setAssets(assetData || []);
      setProjects(projData || []);
      setUsers(userData || []);
      setCoaAsset(coaA || []);
      setCoaAccum(coaAd || []);
      setCoaDepr(coaDe || []);
    } finally {
      setLoading(false);
    }
  };

  const userMap = useMemo(() => {
    const m: Record<number, string> = {};
    users.forEach(u => { m[u.id] = u.display_name || u.username; });
    return m;
  }, [users]);

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return assets.filter(a => {
      if (filterCondition && a.condition !== filterCondition) return false;
      if (filterCategory && a.category !== filterCategory) return false;
      if (s) {
        const haystack = `${a.asset_code} ${a.name} ${a.brand || ''} ${a.model || ''} ${a.serial_number || ''}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [assets, searchTerm, filterCondition, filterCategory]);

  const categories = defaultClass === 'tool' ? TOOL_CATEGORIES : FIXED_ASSET_CATEGORIES;

  // ============================================================
  // CREATE / EDIT
  // ============================================================
  const openCreate = async () => {
    setEditingId(null);
    const code = await generateAssetCode();
    setForm({
      ...emptyForm,
      asset_code: code,
      asset_class: defaultClass,
    });
    setFormOpen(true);
  };

  const openEdit = (a: Asset) => {
    setEditingId(a.id);
    setForm({
      asset_code: a.asset_code,
      name: a.name,
      asset_class: a.asset_class,
      category: a.category || '',
      serial_number: a.serial_number || '',
      brand: a.brand || '',
      model: a.model || '',
      acquisition_date: a.acquisition_date,
      acquisition_cost: String(a.acquisition_cost || ''),
      supplier_name: a.supplier_name || '',
      current_location: a.current_location || '',
      current_holder_user_id: a.current_holder_user_id ? String(a.current_holder_user_id) : '',
      current_project_id: a.current_project_id || '',
      condition: a.condition,
      status: a.status,
      salvage_value: String(a.salvage_value || ''),
      useful_life_months: String(a.useful_life_months || ''),
      depreciation_method: (a.depreciation_method || 'straight_line') as any,
      asset_coa_code: a.asset_coa_code || '',
      accum_depr_coa_code: a.accum_depr_coa_code || '',
      depr_expense_coa_code: a.depr_expense_coa_code || '',
      is_consumable: a.is_consumable,
      notes: a.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('Nama aset wajib diisi'); return; }

    const isFA = form.asset_class === 'fixed_asset';
    if (isFA && (!form.useful_life_months || Number(form.useful_life_months) <= 0)) {
      alert('Aset Tetap wajib mengisi Masa Manfaat (bulan)'); return;
    }
    if (isFA && !form.asset_coa_code) {
      alert('Aset Tetap wajib memilih Akun COA Aset'); return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        asset_code: form.asset_code,
        name: form.name.trim(),
        asset_class: form.asset_class,
        category: form.category || null,
        serial_number: form.serial_number || null,
        brand: form.brand || null,
        model: form.model || null,
        acquisition_date: form.acquisition_date,
        acquisition_cost: Number(form.acquisition_cost) || 0,
        supplier_name: form.supplier_name || null,
        current_location: form.current_location || null,
        current_holder_user_id: form.current_holder_user_id ? Number(form.current_holder_user_id) : null,
        current_project_id: form.current_project_id || null,
        condition: form.condition,
        status: form.status,
        notes: form.notes || null,
        salvage_value: isFA ? (Number(form.salvage_value) || 0) : null,
        useful_life_months: isFA ? Number(form.useful_life_months) : null,
        depreciation_method: isFA ? form.depreciation_method : null,
        asset_coa_code: isFA ? (form.asset_coa_code || null) : null,
        accum_depr_coa_code: isFA ? (form.accum_depr_coa_code || null) : null,
        depr_expense_coa_code: isFA ? (form.depr_expense_coa_code || null) : null,
        is_consumable: form.asset_class === 'tool' ? form.is_consumable : false,
      };

      if (editingId) {
        await api.update('assets', editingId, payload);
      } else {
        const inserted = await api.insert('assets', payload);
        const newAsset: Asset = Array.isArray(inserted) ? inserted[0] : inserted;
        // Catat acquisition movement
        await api.insert('asset_movements', {
          asset_id: newAsset.id,
          date: form.acquisition_date,
          type: 'acquire',
          to_location: form.current_location || null,
          to_holder_user_id: form.current_holder_user_id ? Number(form.current_holder_user_id) : null,
          to_project_id: form.current_project_id || null,
          to_condition: form.condition,
          cost: Number(form.acquisition_cost) || 0,
          notes: 'Pengadaan awal',
        });
        // Generate jadwal penyusutan kalau fixed_asset
        if (isFA) await generateDepreciationSchedule(newAsset);
      }
      setFormOpen(false);
      await fetchAll();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (a: Asset) => {
    if (!confirm(`Hapus aset "${a.asset_code} - ${a.name}"?\nSemua riwayat mutasi & jadwal penyusutan ikut terhapus.`)) return;
    try {
      await api.delete('assets', a.id);
      await fetchAll();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  // ============================================================
  // MUTASI (assign/return/transfer/maintain/dispose/reclassify)
  // ============================================================
  const openMutation = (asset: Asset, type: typeof mutType) => {
    setMutAsset(asset);
    setMutType(type);
    setMutForm({
      date: new Date().toISOString().split('T')[0],
      to_location: type === 'return' ? 'Gudang Pusat' : (asset.current_location || ''),
      to_holder_user_id: type === 'return' ? '' : (asset.current_holder_user_id ? String(asset.current_holder_user_id) : ''),
      to_project_id: type === 'return' ? '' : (asset.current_project_id || ''),
      to_condition: asset.condition,
      cost: '',
      notes: '',
      salvage_value: '',
      useful_life_months: '',
      depreciation_method: 'straight_line',
      asset_coa_code: '',
      accum_depr_coa_code: '',
      depr_expense_coa_code: '',
    });
    setMutOpen(true);
  };

  const handleMutationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutAsset) return;

    if (mutType === 'reclassify') {
      const targetClass: AssetClass = mutAsset.asset_class === 'tool' ? 'fixed_asset' : 'tool';
      if (targetClass === 'fixed_asset') {
        if (!mutForm.useful_life_months || Number(mutForm.useful_life_months) <= 0) {
          alert('Wajib isi Masa Manfaat (bulan)'); return;
        }
        if (!mutForm.asset_coa_code) { alert('Wajib pilih Akun COA Aset'); return; }
      }
      setMutating(true);
      try {
        // Update ke fixed_asset fields jika perlu
        const updatePatch: any = {};
        if (targetClass === 'fixed_asset') {
          updatePatch.salvage_value = Number(mutForm.salvage_value) || 0;
          updatePatch.useful_life_months = Number(mutForm.useful_life_months);
          updatePatch.depreciation_method = mutForm.depreciation_method;
          updatePatch.asset_coa_code = mutForm.asset_coa_code;
          updatePatch.accum_depr_coa_code = mutForm.accum_depr_coa_code || null;
          updatePatch.depr_expense_coa_code = mutForm.depr_expense_coa_code || null;
        } else {
          updatePatch.salvage_value = null;
          updatePatch.useful_life_months = null;
          updatePatch.depreciation_method = null;
          updatePatch.asset_coa_code = null;
          updatePatch.accum_depr_coa_code = null;
          updatePatch.depr_expense_coa_code = null;
        }
        await api.update('assets', mutAsset.id, updatePatch);
        await recordMovement({
          asset: { ...mutAsset, ...updatePatch },
          type: 'reclassify',
          date: mutForm.date,
          to_class: targetClass,
          notes: mutForm.notes || `Reklasifikasi dari ${mutAsset.asset_class} ke ${targetClass}`,
        });
        // Generate jadwal jika baru jadi fixed_asset
        if (targetClass === 'fixed_asset') {
          const refreshed: Asset = (await api.get('assets', `select=*&id=eq.${mutAsset.id}`))[0];
          if (refreshed) await generateDepreciationSchedule(refreshed);
        }
        setMutOpen(false);
        await fetchAll();
      } catch (err: any) {
        alert(`Gagal reklasifikasi: ${err.message}`);
      } finally {
        setMutating(false);
      }
      return;
    }

    setMutating(true);
    try {
      const newStatus: AssetStatus | undefined =
        mutType === 'maintain' ? 'maintenance' :
        mutType === 'dispose' ? 'disposed' :
        'aktif';

      await recordMovement({
        asset: mutAsset,
        type: mutType,
        date: mutForm.date,
        to_location: mutForm.to_location || null,
        to_holder_user_id: mutForm.to_holder_user_id ? Number(mutForm.to_holder_user_id) : null,
        to_project_id: mutForm.to_project_id || null,
        to_condition: mutForm.to_condition,
        cost: Number(mutForm.cost) || 0,
        notes: mutForm.notes || null,
        new_status: newStatus,
      });
      setMutOpen(false);
      await fetchAll();
    } catch (err: any) {
      alert(`Gagal mutasi: ${err.message}`);
    } finally {
      setMutating(false);
    }
  };

  // ============================================================
  // DETAIL
  // ============================================================
  const openDetail = async (a: Asset) => {
    setDetailAsset(a);
    setDetailOpen(true);
    setDetailMovements([]);
    setDetailDepreciation([]);
    setDetailBookValue(null);
    const [mv, dep, bv] = await Promise.all([
      api.get('asset_movements', `select=*&asset_id=eq.${a.id}&order=date.desc,created_at.desc`),
      a.asset_class === 'fixed_asset'
        ? api.get('asset_depreciation', `select=*&asset_id=eq.${a.id}&order=period_year.asc,period_month.asc`)
        : Promise.resolve([]),
      a.asset_class === 'fixed_asset' ? getBookValue(a) : Promise.resolve(null),
    ]);
    setDetailMovements(mv || []);
    setDetailDepreciation(dep || []);
    setDetailBookValue(bv);
  };

  // ============================================================
  // PENYUSUTAN BULANAN (Accounting only)
  // ============================================================
  const [postPeriod, setPostPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const postMonthlyDepreciation = async () => {
    if (!confirm(`Posting jurnal penyusutan untuk periode ${formatPeriod(postPeriod.year, postPeriod.month)}?\nSemua aset tetap aktif yang belum di-posting akan ditandai posted.`)) return;
    try {
      // Generate schedule untuk semua fixed_asset aktif (jaga-jaga ada yang belum punya)
      const fas = assets.filter(a => a.asset_class === 'fixed_asset' && a.status !== 'disposed');
      await Promise.all(fas.map(a => generateDepreciationSchedule(a).catch(() => null)));

      // Ambil row depreciation periode itu yang belum posted
      const rows: any[] = await api.get(
        'asset_depreciation',
        `select=*&period_year=eq.${postPeriod.year}&period_month=eq.${postPeriod.month}&is_posted=eq.false`
      );
      if (rows.length === 0) {
        alert('Tidak ada aset yang perlu di-posting untuk periode ini.');
        return;
      }
      const ref = `DEPR-${postPeriod.year}-${String(postPeriod.month).padStart(2,'0')}`;
      await Promise.all(rows.map(r =>
        api.update('asset_depreciation', r.id, {
          is_posted: true,
          posted_at: new Date().toISOString(),
          journal_ref: ref,
        })
      ));
      alert(`${rows.length} baris penyusutan ditandai posted (ref: ${ref}).`);
      await fetchAll();
    } catch (err: any) {
      alert(`Gagal posting: ${err.message}`);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  const isFA = defaultClass === 'fixed_asset';
  const accentBg = accentColor === 'amber' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700';
  const accentText = accentColor === 'amber' ? 'text-amber-600' : 'text-indigo-600';
  const HeaderIcon = isFA ? Boxes : Wrench;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeaderIcon className={cn("w-6 h-6", accentText)} />
            <h1 className="text-2xl font-bold text-text-primary">{pageTitle}</h1>
          </div>
          <p className="text-text-secondary">{pageSubtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpnameOpen(true)}>
            <ClipboardCheck className="w-4 h-4 mr-2" /> Opname
          </Button>
          {isFA && (
            <Button variant="outline" onClick={postMonthlyDepreciation}>
              <RefreshCw className="w-4 h-4 mr-2" /> Posting Penyusutan
            </Button>
          )}
          <Button onClick={openCreate} className={cn("text-white", accentBg)}>
            <Plus className="w-4 h-4 mr-2" /> Tambah {isFA ? 'Aset' : 'Alat'}
          </Button>
        </div>
      </div>

      {/* Posting period selector (Accounting only) */}
      {isFA && (
        <Card className="p-3 flex items-center gap-3 flex-wrap">
          <Calendar className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-black uppercase tracking-widest text-text-muted">Periode Penyusutan:</span>
          <select
            value={postPeriod.month}
            onChange={e => setPostPeriod({ ...postPeriod, month: Number(e.target.value) })}
            className="h-9 rounded-lg border border-white/40 bg-white/40 px-3 text-sm font-medium"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{formatPeriod(2000, m).split(' ')[0]}</option>
            ))}
          </select>
          <input
            type="number"
            value={postPeriod.year}
            onChange={e => setPostPeriod({ ...postPeriod, year: Number(e.target.value) })}
            className="h-9 w-20 rounded-lg border border-white/40 bg-white/40 px-3 text-sm font-medium"
          />
        </Card>
      )}

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Cari kode, nama, brand, serial..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="h-10 rounded-xl border border-white/40 bg-white/40 px-3 text-sm font-medium text-text-secondary"
          >
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filterCondition}
            onChange={e => setFilterCondition(e.target.value)}
            className="h-10 rounded-xl border border-white/40 bg-white/40 px-3 text-sm font-medium text-text-secondary"
          >
            <option value="">Semua Kondisi</option>
            {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {(filterCategory || filterCondition || searchTerm) && (
            <Button variant="outline" size="sm" onClick={() => { setFilterCategory(''); setFilterCondition(''); setSearchTerm(''); }}>
              <X className="w-4 h-4 mr-1" /> Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Tabel */}
      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[1100px]">
          <THead>
            <TR className="bg-white/30 text-text-secondary text-xs uppercase tracking-wider">
              <TH className="px-4 py-3 font-semibold">Kode</TH>
              <TH className="px-4 py-3 font-semibold">Nama / Detail</TH>
              <TH className="px-4 py-3 font-semibold">Kategori</TH>
              <TH className="px-4 py-3 font-semibold">Lokasi / Pemegang</TH>
              {!isFA && <TH className="px-4 py-3 font-semibold">Proyek</TH>}
              {isFA && <TH className="px-4 py-3 font-semibold text-right">Harga Perolehan</TH>}
              <TH className="px-4 py-3 font-semibold text-center">Kondisi</TH>
              <TH className="px-4 py-3 font-semibold text-center">Status</TH>
              <TH className="px-4 py-3 font-semibold text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR><TD colSpan={9} className="px-6 py-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-dark mx-auto"></div>
              </TD></TR>
            ) : filtered.length === 0 ? (
              <TR><TD colSpan={9} className="px-6 py-10 text-center text-text-secondary">
                Belum ada {isFA ? 'aset tetap' : 'alat kerja'}. Klik "Tambah" untuk mulai.
              </TD></TR>
            ) : (
              filtered.map(a => (
                <TR key={a.id} className={cn("hover:bg-white/30 transition-colors", a.status === 'disposed' && "opacity-50")}>
                  <TD className="px-4 py-3 text-xs font-mono font-bold text-text-secondary">{a.asset_code}</TD>
                  <TD className="px-4 py-3">
                    <div className="text-sm font-bold text-text-primary">{a.name}</div>
                    {(a.brand || a.model) && <div className="text-[11px] text-text-muted">{[a.brand, a.model].filter(Boolean).join(' ')}</div>}
                    {a.serial_number && <div className="text-[10px] font-mono text-text-muted">SN: {a.serial_number}</div>}
                  </TD>
                  <TD className="px-4 py-3 text-xs text-text-secondary capitalize">{a.category?.replace('_', ' ') || '-'}</TD>
                  <TD className="px-4 py-3 text-xs">
                    <div className="font-medium text-text-primary">{a.current_location || '-'}</div>
                    {a.current_holder_user_id && <div className="text-text-muted">↳ {userMap[a.current_holder_user_id] || `User #${a.current_holder_user_id}`}</div>}
                  </TD>
                  {!isFA && (
                    <TD className="px-4 py-3 text-xs text-text-secondary">
                      {a.current_project_id ? (projectMap[a.current_project_id] || '-') : '—'}
                    </TD>
                  )}
                  {isFA && (
                    <TD className="px-4 py-3 text-xs text-right font-bold text-text-primary whitespace-nowrap">
                      {formatCurrency(Number(a.acquisition_cost))}
                    </TD>
                  )}
                  <TD className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold",
                      a.condition === 'baik' ? 'bg-green-100 text-green-700' :
                      a.condition === 'rusak_ringan' ? 'bg-amber-100 text-amber-700' :
                      a.condition === 'rusak_berat' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {CONDITION_LABELS[a.condition]}
                    </span>
                  </TD>
                  <TD className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      a.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' :
                      a.status === 'idle' ? 'bg-slate-100 text-slate-600' :
                      a.status === 'maintenance' ? 'bg-blue-100 text-blue-700' :
                      'bg-rose-100 text-rose-700'
                    )}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </TD>
                  <TD className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Detail" onClick={() => openDetail(a)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!isFA && a.status === 'aktif' && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Pinjam / Assign" onClick={() => openMutation(a, 'assign')}>
                          <ArrowLeftRight className="w-4 h-4" />
                        </Button>
                      )}
                      {a.status !== 'disposed' && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(a)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" title="Hapus" onClick={() => handleDelete(a)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {/* ============= MODAL FORM ============= */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingId ? `Edit ${isFA ? 'Aset' : 'Alat'}` : `Tambah ${isFA ? 'Aset' : 'Alat'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Klasifikasi radio (paling atas, manual) */}
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 mb-2">Klasifikasi</p>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                <input type="radio" name="cls" checked={form.asset_class === 'tool'}
                  onChange={() => setForm({ ...form, asset_class: 'tool' })} />
                <Wrench className="w-4 h-4 text-amber-600" /> Alat Kerja (Teknik)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                <input type="radio" name="cls" checked={form.asset_class === 'fixed_asset'}
                  onChange={() => setForm({ ...form, asset_class: 'fixed_asset' })} />
                <Boxes className="w-4 h-4 text-indigo-600" /> Aset Tetap (Accounting)
              </label>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5">Klasifikasi bisa diubah kapan saja lewat tombol Reklasifikasi di detail.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Kode Aset" value={form.asset_code} onChange={e => setForm({ ...form, asset_code: e.target.value })} required />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Kategori</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                <option value="">— Pilih —</option>
                {(form.asset_class === 'tool' ? TOOL_CATEGORIES : FIXED_ASSET_CATEGORIES).map(c =>
                  <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <Input label="Nama Aset" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Mis. Bor Listrik Makita HP1640" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            <Input label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            <Input label="Serial Number" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Tanggal Beli" type="date" value={form.acquisition_date} onChange={e => setForm({ ...form, acquisition_date: e.target.value })} required />
            <Input label="Harga Perolehan (Rp)" type="number" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: e.target.value })} required />
            <Input label="Supplier" value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Lokasi Sekarang" value={form.current_location} onChange={e => setForm({ ...form, current_location: e.target.value })} />
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Pemegang (User)</label>
              <select value={form.current_holder_user_id} onChange={e => setForm({ ...form, current_holder_user_id: e.target.value })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                <option value="">— Tidak ada —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Proyek</label>
              <select value={form.current_project_id} onChange={e => setForm({ ...form, current_project_id: e.target.value })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                <option value="">— Tidak ada —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Kondisi</label>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as AssetCondition })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as AssetStatus })}
                className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Field khusus tool */}
          {form.asset_class === 'tool' && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.is_consumable} onChange={e => setForm({ ...form, is_consumable: e.target.checked })} />
              Barang habis pakai (mata bor, sarung tangan, dst)
            </label>
          )}

          {/* Field khusus fixed_asset */}
          {form.asset_class === 'fixed_asset' && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Penyusutan & Akuntansi</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Nilai Sisa (Rp)" type="number" value={form.salvage_value} onChange={e => setForm({ ...form, salvage_value: e.target.value })} />
                <Input label="Masa Manfaat (bulan)" type="number" value={form.useful_life_months} onChange={e => setForm({ ...form, useful_life_months: e.target.value })} required />
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">Metode Penyusutan</label>
                  <select value={form.depreciation_method} onChange={e => setForm({ ...form, depreciation_method: e.target.value as any })}
                    className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                    <option value="straight_line">Garis Lurus</option>
                    <option value="none">Tanpa Penyusutan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">Akun COA Aset *</label>
                <select value={form.asset_coa_code} onChange={e => setForm({ ...form, asset_coa_code: e.target.value })}
                  className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" required>
                  <option value="">— Pilih Akun Aset (1xxxxxx) —</option>
                  {coaAsset.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">Akun Akumulasi Penyusutan</label>
                  <select value={form.accum_depr_coa_code} onChange={e => setForm({ ...form, accum_depr_coa_code: e.target.value })}
                    className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                    <option value="">—</option>
                    {coaAccum.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">Akun Beban Penyusutan</label>
                  <select value={form.depr_expense_coa_code} onChange={e => setForm({ ...form, depr_expense_coa_code: e.target.value })}
                    className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                    <option value="">—</option>
                    {coaDepr.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Catatan</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting} className={cn("text-white border-0", accentBg)}>
              {editingId ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============= MODAL MUTASI ============= */}
      <Modal isOpen={mutOpen} onClose={() => setMutOpen(false)} title={
        mutType === 'assign' ? 'Pinjam / Assign Alat' :
        mutType === 'return' ? 'Kembalikan Alat' :
        mutType === 'transfer' ? 'Transfer Lokasi' :
        mutType === 'maintain' ? 'Mutasi Pemeliharaan' :
        mutType === 'dispose' ? 'Lepas / Jual Aset' :
        'Reklasifikasi Aset'
      } size="lg">
        <form onSubmit={handleMutationSubmit} className="space-y-4">
          {mutAsset && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Aset</p>
              <p className="text-sm font-bold text-text-primary">{mutAsset.asset_code} — {mutAsset.name}</p>
              <p className="text-xs text-text-muted">Kondisi: {CONDITION_LABELS[mutAsset.condition]} • Lokasi: {mutAsset.current_location || '-'}</p>
            </div>
          )}

          <Input label="Tanggal" type="date" value={mutForm.date} onChange={e => setMutForm({ ...mutForm, date: e.target.value })} required />

          {mutType !== 'reclassify' && (
            <>
              <Input label="Lokasi Tujuan" value={mutForm.to_location} onChange={e => setMutForm({ ...mutForm, to_location: e.target.value })} />
              {(mutType === 'assign' || mutType === 'transfer') && (
                <>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1.5 block">Pemegang Baru</label>
                    <select value={mutForm.to_holder_user_id} onChange={e => setMutForm({ ...mutForm, to_holder_user_id: e.target.value })}
                      className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                      <option value="">— Tidak ada —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1.5 block">Proyek Tujuan</label>
                    <select value={mutForm.to_project_id} onChange={e => setMutForm({ ...mutForm, to_project_id: e.target.value })}
                      className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                      <option value="">— Tidak ada —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">Kondisi Setelah Mutasi</label>
                <select value={mutForm.to_condition} onChange={e => setMutForm({ ...mutForm, to_condition: e.target.value as AssetCondition })}
                  className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                  {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {(mutType === 'maintain' || mutType === 'dispose') && (
                <Input label={mutType === 'maintain' ? 'Biaya Pemeliharaan (Rp)' : 'Hasil Jual / Nilai Lepas (Rp)'}
                  type="number" value={mutForm.cost} onChange={e => setMutForm({ ...mutForm, cost: e.target.value })} />
              )}
            </>
          )}

          {mutType === 'reclassify' && mutAsset && (
            <>
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-sm">
                <strong>Klasifikasi saat ini:</strong> {mutAsset.asset_class === 'tool' ? 'Alat Kerja' : 'Aset Tetap'} →{' '}
                <strong>akan diubah ke:</strong> {mutAsset.asset_class === 'tool' ? 'Aset Tetap' : 'Alat Kerja'}
              </div>
              {mutAsset.asset_class === 'tool' && (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Field Penyusutan Wajib</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input label="Nilai Sisa (Rp)" type="number" value={mutForm.salvage_value} onChange={e => setMutForm({ ...mutForm, salvage_value: e.target.value })} />
                    <Input label="Masa Manfaat (bulan)" type="number" value={mutForm.useful_life_months} onChange={e => setMutForm({ ...mutForm, useful_life_months: e.target.value })} required />
                    <div>
                      <label className="text-sm font-medium text-text-primary mb-1.5 block">Metode</label>
                      <select value={mutForm.depreciation_method} onChange={e => setMutForm({ ...mutForm, depreciation_method: e.target.value as any })}
                        className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                        <option value="straight_line">Garis Lurus</option>
                        <option value="none">Tanpa Penyusutan</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1.5 block">Akun COA Aset *</label>
                    <select value={mutForm.asset_coa_code} onChange={e => setMutForm({ ...mutForm, asset_coa_code: e.target.value })}
                      className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none" required>
                      <option value="">— Pilih Akun Aset —</option>
                      {coaAsset.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-text-primary mb-1.5 block">Akun Akumulasi</label>
                      <select value={mutForm.accum_depr_coa_code} onChange={e => setMutForm({ ...mutForm, accum_depr_coa_code: e.target.value })}
                        className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                        <option value="">—</option>
                        {coaAccum.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-primary mb-1.5 block">Akun Beban Penyusutan</label>
                      <select value={mutForm.depr_expense_coa_code} onChange={e => setMutForm({ ...mutForm, depr_expense_coa_code: e.target.value })}
                        className="w-full h-10 rounded-xl glass-input px-3 py-2 text-sm focus:outline-none">
                        <option value="">—</option>
                        {coaDepr.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Catatan</label>
            <textarea value={mutForm.notes} onChange={e => setMutForm({ ...mutForm, notes: e.target.value })} rows={2}
              className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setMutOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={mutating} className={cn("text-white border-0", accentBg)}>Eksekusi</Button>
          </div>
        </form>
      </Modal>

      {/* ============= MODAL DETAIL ============= */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Aset" size="xl">
        {detailAsset && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-mono text-text-muted">{detailAsset.asset_code}</p>
                  <h3 className="text-lg font-bold text-text-primary">{detailAsset.name}</h3>
                  <p className="text-xs text-text-secondary">{[detailAsset.brand, detailAsset.model].filter(Boolean).join(' ')} {detailAsset.serial_number && `• SN: ${detailAsset.serial_number}`}</p>
                </div>
                <div className="flex flex-col gap-1 items-end text-right">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                    detailAsset.asset_class === 'tool' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  )}>
                    {detailAsset.asset_class === 'tool' ? 'Alat Kerja' : 'Aset Tetap'}
                  </span>
                  <p className="text-xs text-text-muted">Beli: {formatDate(detailAsset.acquisition_date)} — {formatCurrency(Number(detailAsset.acquisition_cost))}</p>
                </div>
              </div>
            </div>

            {/* Book value (fixed asset only) */}
            {detailAsset.asset_class === 'fixed_asset' && detailBookValue && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Akumulasi Penyusutan</p>
                  <p className="text-lg font-bold text-indigo-900">{formatCurrency(detailBookValue.accumulated_depreciation)}</p>
                  <p className="text-[10px] text-text-muted">{detailBookValue.posted_count}/{detailBookValue.total_count} bulan</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Nilai Buku</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(detailBookValue.book_value)}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Sisa Bulan</p>
                  <p className="text-lg font-bold text-amber-900">{detailBookValue.remaining_months}</p>
                </div>
              </div>
            )}

            {/* Aksi cepat */}
            <div className="flex gap-2 flex-wrap">
              {detailAsset.status !== 'disposed' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setDetailOpen(false); openMutation(detailAsset, 'assign'); }}>
                    Pinjam / Assign
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDetailOpen(false); openMutation(detailAsset, 'return'); }}>
                    Kembalikan
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDetailOpen(false); openMutation(detailAsset, 'maintain'); }}>
                    Pemeliharaan
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDetailOpen(false); openMutation(detailAsset, 'reclassify'); }}>
                    Reklasifikasi → {detailAsset.asset_class === 'tool' ? 'Aset Tetap' : 'Alat Kerja'}
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-600" onClick={() => { setDetailOpen(false); openMutation(detailAsset, 'dispose'); }}>
                    Lepas / Jual
                  </Button>
                </>
              )}
            </div>

            {/* Riwayat Mutasi */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">Riwayat Mutasi</h4>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                {detailMovements.length === 0 ? (
                  <p className="p-4 text-xs text-text-muted text-center">Belum ada mutasi.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Tanggal</th>
                        <th className="px-3 py-2 text-left">Tipe</th>
                        <th className="px-3 py-2 text-left">Lokasi/Pemegang</th>
                        <th className="px-3 py-2 text-right">Biaya</th>
                        <th className="px-3 py-2 text-left">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailMovements.map((m: any) => (
                        <tr key={m.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-text-secondary">{formatDate(m.date)}</td>
                          <td className="px-3 py-2 capitalize font-bold text-violet-700">{m.type}</td>
                          <td className="px-3 py-2 text-text-secondary">
                            {m.to_location || '-'}{m.to_holder_user_id && ` / ${userMap[m.to_holder_user_id]}`}
                          </td>
                          <td className="px-3 py-2 text-right">{m.cost ? formatCurrency(Number(m.cost)) : '-'}</td>
                          <td className="px-3 py-2 text-text-muted">{m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Jadwal Penyusutan */}
            {detailAsset.asset_class === 'fixed_asset' && detailDepreciation.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-text-muted mb-2">Jadwal Penyusutan</h4>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Periode</th>
                        <th className="px-3 py-2 text-right">Jumlah</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailDepreciation.map((d: any) => (
                        <tr key={d.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{formatPeriod(d.period_year, d.period_month)}</td>
                          <td className="px-3 py-2 text-right font-bold">{formatCurrency(Number(d.amount))}</td>
                          <td className="px-3 py-2 text-center">
                            {d.is_posted
                              ? <span className="text-emerald-600 font-bold">✓ Posted</span>
                              : <span className="text-text-muted">Pending</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ============= MODAL OPNAME ============= */}
      <OpnameModal
        isOpen={opnameOpen}
        onClose={() => setOpnameOpen(false)}
        scope={defaultClass}
        assets={assets}
        users={users}
        userMap={userMap}
        onFinalized={fetchAll}
      />
    </div>
  );
};

// =====================================================================
// Sub-komponen: OpnameModal (sesi opname dengan checklist)
// =====================================================================
const OpnameModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  scope: AssetClass;
  assets: Asset[];
  users: UserOpt[];
  userMap: Record<number, string>;
  onFinalized: () => void;
}> = ({ isOpen, onClose, scope, assets, users, userMap, onFinalized }) => {
  const [step, setStep] = useState<'config' | 'execute'>('config');
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [opnameNotes, setOpnameNotes] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep('config');
      setItems([]);
      setOpnameNotes('');
    }
  }, [isOpen]);

  const startOpname = () => {
    const initial = assets.filter(a => a.status !== 'disposed').map(a => ({
      asset_id: a.id,
      asset_code: a.asset_code,
      name: a.name,
      expected_location: a.current_location || '',
      expected_holder_user_id: a.current_holder_user_id,
      expected_condition: a.condition,
      actual_location: a.current_location || '',
      actual_holder_user_id: a.current_holder_user_id,
      actual_condition: a.condition,
      is_found: true,
      notes: '',
    }));
    setItems(initial);
    setStep('execute');
  };

  const updateItem = (idx: number, patch: any) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const finalize = async () => {
    if (!confirm(`Finalisasi opname ${items.length} item? Selisih akan otomatis tercatat sebagai mutasi opname_adjust.`)) return;
    setSubmitting(true);
    try {
      const code = await (await import('../../lib/asset')).generateOpnameCode();
      // Insert header
      const inserted = await api.insert('asset_opname', {
        opname_code: code,
        opname_date: opnameDate,
        scope,
        status: 'finalized',
        notes: opnameNotes || null,
        finalized_at: new Date().toISOString(),
      });
      const opnameId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;

      // Process per item
      for (const it of items) {
        let varianceType = 'none';
        if (!it.is_found) varianceType = 'missing';
        else if (it.actual_location !== it.expected_location) varianceType = 'location';
        else if (it.actual_holder_user_id !== it.expected_holder_user_id) varianceType = 'holder';
        else if (it.actual_condition !== it.expected_condition) varianceType = 'condition';

        // Insert opname item
        await api.insert('asset_opname_items', {
          opname_id: opnameId,
          asset_id: it.asset_id,
          expected_location: it.expected_location,
          expected_holder_user_id: it.expected_holder_user_id,
          expected_condition: it.expected_condition,
          actual_location: it.actual_location,
          actual_holder_user_id: it.actual_holder_user_id,
          actual_condition: it.actual_condition,
          is_found: it.is_found,
          variance_type: varianceType,
          notes: it.notes || null,
        });

        // Apply selisih ke master & catat movement
        if (varianceType !== 'none') {
          const asset = assets.find(a => a.id === it.asset_id);
          if (!asset) continue;
          const newCondition: AssetCondition = !it.is_found ? 'hilang' : it.actual_condition;
          await recordMovement({
            asset,
            type: 'opname_adjust',
            date: opnameDate,
            to_location: it.actual_location,
            to_holder_user_id: it.actual_holder_user_id,
            to_condition: newCondition,
            notes: `Opname ${code} — ${varianceType}${it.notes ? ' • ' + it.notes : ''}`,
          });
        }
      }

      alert(`Opname ${code} difinalisasi.`);
      onFinalized();
      onClose();
    } catch (err: any) {
      alert(`Gagal finalisasi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'config' ? 'Mulai Opname' : 'Eksekusi Opname'} size="xl">
      {step === 'config' ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              Opname akan mencakup <strong>{assets.filter(a => a.status !== 'disposed').length} aset {scope === 'tool' ? 'alat kerja' : 'aset tetap'}</strong> aktif.
              Saat finalisasi, perbedaan kondisi/lokasi/pemegang akan otomatis tercatat sebagai mutasi.
            </p>
          </div>
          <Input label="Tanggal Opname" type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-text-primary mb-1.5 block">Catatan</label>
            <textarea value={opnameNotes} onChange={e => setOpnameNotes(e.target.value)} rows={2}
              className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-none resize-none" placeholder="Mis. Opname kuartal 2 / 2026..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={startOpname}>Mulai Opname</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-text-muted">
            Centang ditemukan/tidak. Update lokasi, pemegang, dan kondisi sesuai kondisi fisik. Selisih akan otomatis dicatat saat finalisasi.
          </div>
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left">Found</th>
                  <th className="px-2 py-2 text-left">Aset</th>
                  <th className="px-2 py-2 text-left">Lokasi Aktual</th>
                  <th className="px-2 py-2 text-left">Pemegang Aktual</th>
                  <th className="px-2 py-2 text-left">Kondisi Aktual</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const expected = `${it.expected_location || '-'} / ${it.expected_holder_user_id ? userMap[it.expected_holder_user_id] : '-'} / ${CONDITION_LABELS[it.expected_condition as AssetCondition] || '-'}`;
                  return (
                    <tr key={it.asset_id} className={cn("border-t border-slate-100", !it.is_found && "bg-rose-50")}>
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={it.is_found} onChange={e => updateItem(idx, { is_found: e.target.checked })} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-[10px] font-mono text-text-muted">{it.asset_code}</div>
                        <div className="text-xs font-bold">{it.name}</div>
                        <div className="text-[10px] text-text-muted">Expected: {expected}</div>
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" value={it.actual_location} onChange={e => updateItem(idx, { actual_location: e.target.value })}
                          className="w-full h-8 px-2 text-xs rounded border border-slate-200 focus:outline-none" disabled={!it.is_found} />
                      </td>
                      <td className="px-2 py-2">
                        <select value={it.actual_holder_user_id || ''} onChange={e => updateItem(idx, { actual_holder_user_id: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-8 px-2 text-xs rounded border border-slate-200 focus:outline-none" disabled={!it.is_found}>
                          <option value="">—</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select value={it.actual_condition} onChange={e => updateItem(idx, { actual_condition: e.target.value })}
                          className="w-full h-8 px-2 text-xs rounded border border-slate-200 focus:outline-none" disabled={!it.is_found}>
                          {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep('config')}>Kembali</Button>
            <Button onClick={finalize} isLoading={submitting}>Finalisasi Opname</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AssetView;
