// =====================================================================
// Asset Helper — Operasi inventaris (Alat Kerja & Aset Tetap)
// =====================================================================

import { api } from './api';

export type AssetClass = 'tool' | 'fixed_asset';
export type AssetCondition = 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang' | 'disposed';
export type AssetStatus = 'aktif' | 'idle' | 'maintenance' | 'disposed';
export type MovementType =
  | 'acquire' | 'assign' | 'return' | 'transfer'
  | 'maintain' | 'reclassify' | 'dispose' | 'opname_adjust';
export type DepreciationMethod = 'straight_line' | 'none';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  asset_class: AssetClass;
  category: string | null;
  serial_number: string | null;
  brand: string | null;
  model: string | null;
  acquisition_date: string;
  acquisition_cost: number;
  supplier_name: string | null;
  current_location: string | null;
  current_holder_user_id: number | null;
  current_project_id: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  salvage_value: number | null;
  useful_life_months: number | null;
  depreciation_method: DepreciationMethod | null;
  asset_coa_code: string | null;
  accum_depr_coa_code: string | null;
  depr_expense_coa_code: string | null;
  is_consumable: boolean;
  notes: string | null;
  photo_url: string | null;
}

export interface AssetMovement {
  id: string;
  asset_id: string;
  date: string;
  type: MovementType;
  from_location: string | null;
  to_location: string | null;
  from_holder_user_id: number | null;
  to_holder_user_id: number | null;
  from_project_id: string | null;
  to_project_id: string | null;
  from_condition: AssetCondition | null;
  to_condition: AssetCondition | null;
  from_class: AssetClass | null;
  to_class: AssetClass | null;
  cost: number;
  notes: string | null;
  created_at: string;
}

export interface AssetDepreciation {
  id: string;
  asset_id: string;
  period_year: number;
  period_month: number;
  amount: number;
  is_posted: boolean;
  posted_at: string | null;
  journal_ref: string | null;
}

// Kategori standar
export const TOOL_CATEGORIES = [
  { value: 'alat_tangan',    label: 'Alat Tangan' },
  { value: 'alat_berat',     label: 'Alat Berat' },
  { value: 'apd',            label: 'APD (Alat Pelindung Diri)' },
  { value: 'perancah',       label: 'Perancah / Scaffolding' },
  { value: 'mesin_listrik',  label: 'Mesin Listrik' },
  { value: 'lain_lain',      label: 'Lain-lain' },
];

export const FIXED_ASSET_CATEGORIES = [
  { value: 'kendaraan',         label: 'Kendaraan' },
  { value: 'bangunan',          label: 'Bangunan' },
  { value: 'peralatan_kantor',  label: 'Peralatan Kantor' },
  { value: 'mebel',             label: 'Mebel & Furnitur' },
  { value: 'elektronik',        label: 'Elektronik' },
  { value: 'lain_lain',         label: 'Lain-lain' },
];

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  hilang: 'Hilang',
  disposed: 'Sudah Dilepas',
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  aktif: 'Aktif',
  idle: 'Idle',
  maintenance: 'Pemeliharaan',
  disposed: 'Dilepas',
};

// ---------------------------------------------------------------------
// Auto-generate kode aset: AST-YYYY-XXXX
// ---------------------------------------------------------------------
export async function generateAssetCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AST-${year}-`;
  const last = await api.get(
    'assets',
    `select=asset_code&asset_code=like.${prefix}%&order=asset_code.desc&limit=1`
  );
  const seq = last && last[0]
    ? (Number(last[0].asset_code.split('-')[2]) || 0) + 1
    : 1;
  return `${prefix}${seq.toString().padStart(4, '0')}`;
}

// Auto-generate kode opname: OPN-YYYY-XXX
export async function generateOpnameCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OPN-${year}-`;
  const last = await api.get(
    'asset_opname',
    `select=opname_code&opname_code=like.${prefix}%&order=opname_code.desc&limit=1`
  );
  const seq = last && last[0]
    ? (Number(last[0].opname_code.split('-')[2]) || 0) + 1
    : 1;
  return `${prefix}${seq.toString().padStart(3, '0')}`;
}

// ---------------------------------------------------------------------
// Catat mutasi & sinkron field master
// ---------------------------------------------------------------------
export interface RecordMovementInput {
  asset: Asset;
  type: MovementType;
  date: string;
  to_location?: string | null;
  to_holder_user_id?: number | null;
  to_project_id?: string | null;
  to_condition?: AssetCondition | null;
  to_class?: AssetClass | null;
  cost?: number;
  notes?: string | null;
  // Optional: untuk update status di master
  new_status?: AssetStatus;
}

export async function recordMovement(input: RecordMovementInput): Promise<void> {
  const a = input.asset;

  // Insert riwayat mutasi
  await api.insert('asset_movements', {
    asset_id: a.id,
    date: input.date,
    type: input.type,
    from_location: a.current_location,
    to_location: input.to_location ?? a.current_location,
    from_holder_user_id: a.current_holder_user_id,
    to_holder_user_id: input.to_holder_user_id ?? a.current_holder_user_id,
    from_project_id: a.current_project_id,
    to_project_id: input.to_project_id ?? a.current_project_id,
    from_condition: a.condition,
    to_condition: input.to_condition ?? a.condition,
    from_class: input.type === 'reclassify' ? a.asset_class : null,
    to_class: input.type === 'reclassify' ? (input.to_class ?? null) : null,
    cost: input.cost ?? 0,
    notes: input.notes ?? null,
  });

  // Update master
  const masterUpdate: any = {
    current_location: input.to_location ?? a.current_location,
    current_holder_user_id: input.to_holder_user_id ?? a.current_holder_user_id,
    current_project_id: input.to_project_id ?? a.current_project_id,
    condition: input.to_condition ?? a.condition,
    updated_at: new Date().toISOString(),
  };
  if (input.new_status) masterUpdate.status = input.new_status;
  if (input.type === 'reclassify' && input.to_class) masterUpdate.asset_class = input.to_class;
  if (input.type === 'dispose') {
    masterUpdate.status = 'disposed';
    masterUpdate.condition = 'disposed';
  }

  await api.update('assets', a.id, masterUpdate);
}

// ---------------------------------------------------------------------
// Generate jadwal penyusutan (straight line) untuk satu aset
// ---------------------------------------------------------------------
export async function generateDepreciationSchedule(asset: Asset): Promise<void> {
  if (asset.asset_class !== 'fixed_asset') throw new Error('Hanya untuk fixed_asset');
  if (!asset.useful_life_months || asset.useful_life_months <= 0) {
    throw new Error('Masa manfaat tidak valid');
  }
  if (asset.depreciation_method === 'none') return;

  const depreciable = (asset.acquisition_cost || 0) - (asset.salvage_value || 0);
  if (depreciable <= 0) return;
  const monthlyAmount = Math.round(depreciable / asset.useful_life_months);

  // Ambil existing schedule supaya tidak duplikasi
  const existing: AssetDepreciation[] = await api.get(
    'asset_depreciation',
    `select=period_year,period_month&asset_id=eq.${asset.id}`
  );
  const existingSet = new Set(existing.map(e => `${e.period_year}-${e.period_month}`));

  const startDate = new Date(asset.acquisition_date + 'T00:00:00');
  const rows: any[] = [];
  for (let i = 0; i < asset.useful_life_months; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (existingSet.has(`${y}-${m}`)) continue;
    rows.push({
      asset_id: asset.id,
      period_year: y,
      period_month: m,
      amount: monthlyAmount,
      is_posted: false,
    });
  }
  if (rows.length > 0) await api.insert('asset_depreciation', rows);
}

// ---------------------------------------------------------------------
// Hitung akumulasi penyusutan & nilai buku saat ini
// ---------------------------------------------------------------------
export interface BookValueSummary {
  acquisition_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  posted_count: number;
  total_count: number;
  remaining_months: number;
}

export async function getBookValue(asset: Asset): Promise<BookValueSummary> {
  if (asset.asset_class !== 'fixed_asset') {
    return {
      acquisition_cost: asset.acquisition_cost || 0,
      accumulated_depreciation: 0,
      book_value: asset.acquisition_cost || 0,
      posted_count: 0,
      total_count: 0,
      remaining_months: 0,
    };
  }
  const all: AssetDepreciation[] = await api.get(
    'asset_depreciation',
    `select=*&asset_id=eq.${asset.id}`
  );
  const posted = all.filter(d => d.is_posted);
  const accum = posted.reduce((s, d) => s + Number(d.amount), 0);
  return {
    acquisition_cost: Number(asset.acquisition_cost) || 0,
    accumulated_depreciation: accum,
    book_value: (Number(asset.acquisition_cost) || 0) - accum,
    posted_count: posted.length,
    total_count: all.length,
    remaining_months: all.length - posted.length,
  };
}

// ---------------------------------------------------------------------
// Format helper
// ---------------------------------------------------------------------
export const formatPeriod = (year: number, month: number): string => {
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${months[month - 1]} ${year}`;
};
