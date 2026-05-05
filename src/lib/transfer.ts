// =====================================================================
// Transfer Helper — Mekanisme transfer saldo antar akun
// Mendukung 4 skenario:
//   A. Bank/Kas Besar  ↔  Bank/Kas Besar    (2 row di cash_flow)
//   B. Bank/Kas Besar  →   Petty Cash       (1 cash_flow OUT + 1 petty_cash IN)
//   C. Petty Cash      →   Bank/Kas Besar   (1 petty_cash OUT + 1 cash_flow IN)
//   D. Petty Cash      ↔   Petty Cash       (2 row di petty_cash, antar dompet)
//
// Petty Cash punya 2 varian dompet:
//   - division='keuangan'           (single dompet, project_id=NULL)
//   - division='teknik' + projectId (per-proyek dompet)
//
// Semua row pasangan di-link via `transfer_group_id` (UUID identik) supaya
// bisa dihapus berbarengan dan dilaporkan sebagai satu transaksi logis.
// =====================================================================

import { api } from './api';

const TRANSFER_CATEGORY = 'Transfer Antar Akun';

// Tipe identitas akun yang bisa jadi sumber/tujuan transfer
export type AccountRef =
  | { kind: 'bank'; id: string; label: string }
  | { kind: 'cash_besar'; label: string }
  | { kind: 'petty_cash'; division: 'keuangan'; label: string }
  | { kind: 'petty_cash'; division: 'teknik'; projectId: string; label: string };

export interface TransferInput {
  date: string;          // YYYY-MM-DD
  amount: number;
  description?: string;
  from: AccountRef;
  to: AccountRef;
  requestedBy?: string;  // Hanya dipakai jika sisi Petty Cash terlibat
}

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const accountLabel = (a: AccountRef): string => a.label;

// Ekstrak division & project_id dari AccountRef Petty Cash
const pettyDivision = (a: AccountRef): 'keuangan' | 'teknik' | null => {
  if (a.kind !== 'petty_cash') return null;
  return a.division;
};
const pettyProjectId = (a: AccountRef): string | null => {
  if (a.kind === 'petty_cash' && a.division === 'teknik') return a.projectId;
  return null;
};

// Identitas dompet petty cash sebagai string unik (untuk cek "akun yg sama")
const pettyKey = (a: AccountRef): string | null => {
  if (a.kind !== 'petty_cash') return null;
  return a.division === 'teknik' ? `petty:teknik:${a.projectId}` : 'petty:keuangan';
};

// ---------------------------------------------------------------------
// Skenario A: cash_flow ↔ cash_flow  (bank/kas_besar antar dirinya)
// ---------------------------------------------------------------------
async function transferCashFlowToCashFlow(input: TransferInput): Promise<void> {
  const groupId = uuid();
  const fromBankId = input.from.kind === 'bank' ? input.from.id : null;
  const toBankId   = input.to.kind   === 'bank' ? input.to.id   : null;
  const fromTargetType = input.from.kind === 'bank' ? 'bank' : 'cash_besar';
  const toTargetType   = input.to.kind   === 'bank' ? 'bank' : 'cash_besar';

  const outRow = await api.insert('cash_flow', {
    date: input.date,
    type: 'out',
    category: TRANSFER_CATEGORY,
    description: input.description || `Transfer ke ${accountLabel(input.to)}`,
    amount: input.amount,
    bank_account_id: fromBankId,
    status: 'verified',
    reference_type: 'transfer',
    transfer_group_id: groupId,
    transfer_target_type: toTargetType,
    transfer_target_id: toBankId,
  });

  try {
    await api.insert('cash_flow', {
      date: input.date,
      type: 'in',
      category: TRANSFER_CATEGORY,
      description: input.description || `Transfer dari ${accountLabel(input.from)}`,
      amount: input.amount,
      bank_account_id: toBankId,
      status: 'verified',
      reference_type: 'transfer',
      transfer_group_id: groupId,
      transfer_target_type: fromTargetType,
      transfer_target_id: fromBankId,
    });
  } catch (err) {
    const outId = Array.isArray(outRow) ? outRow[0]?.id : outRow?.id;
    if (outId) await api.delete('cash_flow', outId).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------
// Skenario B: Bank/Kas Besar → Petty Cash (keuangan / teknik per proyek)
// ---------------------------------------------------------------------
async function transferToPettyCash(input: TransferInput): Promise<void> {
  if (input.to.kind !== 'petty_cash') throw new Error('Tujuan harus Petty Cash');
  if (input.from.kind === 'petty_cash') throw new Error('Sumber tidak boleh Petty Cash di skenario ini');

  const groupId = uuid();
  const fromBankId = input.from.kind === 'bank' ? input.from.id : null;
  const fromKindForPetty = input.from.kind === 'bank' ? 'bank' : 'cash_besar';
  const toDivision  = pettyDivision(input.to)!;
  const toProjectId = pettyProjectId(input.to);

  const cashRow = await api.insert('cash_flow', {
    date: input.date,
    type: 'out',
    category: TRANSFER_CATEGORY,
    description: input.description || `Transfer ke ${accountLabel(input.to)}`,
    amount: input.amount,
    bank_account_id: fromBankId,
    status: 'verified',
    reference_type: 'transfer',
    transfer_group_id: groupId,
    transfer_target_type: 'petty_cash',
    transfer_target_id: null,
  });

  try {
    await api.insert('petty_cash', {
      date: input.date,
      type: 'in',
      amount: input.amount,
      requested_by: input.requestedBy || 'Transfer',
      description: input.description || `Top-up dari ${accountLabel(input.from)}`,
      status: 'approved',
      transfer_group_id: groupId,
      source_type: fromKindForPetty,
      source_id: fromBankId,
      division: toDivision,
      project_id: toProjectId,
    });
  } catch (err) {
    const cashId = Array.isArray(cashRow) ? cashRow[0]?.id : cashRow?.id;
    if (cashId) await api.delete('cash_flow', cashId).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------
// Skenario C: Petty Cash → Bank/Kas Besar
// ---------------------------------------------------------------------
async function transferFromPettyCash(input: TransferInput): Promise<void> {
  if (input.from.kind !== 'petty_cash') throw new Error('Sumber harus Petty Cash');
  if (input.to.kind === 'petty_cash') throw new Error('Tujuan tidak boleh Petty Cash di skenario ini');

  const groupId = uuid();
  const toBankId = input.to.kind === 'bank' ? input.to.id : null;
  const toKindForPetty = input.to.kind === 'bank' ? 'bank' : 'cash_besar';
  const fromDivision  = pettyDivision(input.from)!;
  const fromProjectId = pettyProjectId(input.from);

  const pettyRow = await api.insert('petty_cash', {
    date: input.date,
    type: 'out',
    amount: input.amount,
    requested_by: input.requestedBy || 'Transfer',
    description: input.description || `Setoran ke ${accountLabel(input.to)}`,
    status: 'approved',
    transfer_group_id: groupId,
    source_type: toKindForPetty,
    source_id: toBankId,
    division: fromDivision,
    project_id: fromProjectId,
  });

  try {
    await api.insert('cash_flow', {
      date: input.date,
      type: 'in',
      category: TRANSFER_CATEGORY,
      description: input.description || `Setoran dari ${accountLabel(input.from)}`,
      amount: input.amount,
      bank_account_id: toBankId,
      status: 'verified',
      reference_type: 'transfer',
      transfer_group_id: groupId,
      transfer_target_type: 'petty_cash',
      transfer_target_id: null,
    });
  } catch (err) {
    const pettyId = Array.isArray(pettyRow) ? pettyRow[0]?.id : pettyRow?.id;
    if (pettyId) await api.delete('petty_cash', pettyId).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------
// Skenario D: Petty Cash ↔ Petty Cash (antar dompet)
// (PC Keuangan ↔ PC Teknik proyek X, atau PC Teknik proyek X ↔ PC Teknik proyek Y)
// Tidak menyentuh cash_flow karena uang tidak melewati bank/kas besar.
// ---------------------------------------------------------------------
async function transferPettyToPetty(input: TransferInput): Promise<void> {
  if (input.from.kind !== 'petty_cash' || input.to.kind !== 'petty_cash') {
    throw new Error('Skenario D harus Petty ↔ Petty');
  }

  const groupId = uuid();
  const fromDiv = pettyDivision(input.from)!;
  const fromPid = pettyProjectId(input.from);
  const toDiv   = pettyDivision(input.to)!;
  const toPid   = pettyProjectId(input.to);

  // OUT di dompet sumber
  const outRow = await api.insert('petty_cash', {
    date: input.date,
    type: 'out',
    amount: input.amount,
    requested_by: input.requestedBy || 'Transfer',
    description: input.description || `Transfer ke ${accountLabel(input.to)}`,
    status: 'approved',
    transfer_group_id: groupId,
    source_type: 'petty_cash',
    source_id: null,
    division: fromDiv,
    project_id: fromPid,
  });

  try {
    // IN di dompet tujuan
    await api.insert('petty_cash', {
      date: input.date,
      type: 'in',
      amount: input.amount,
      requested_by: input.requestedBy || 'Transfer',
      description: input.description || `Transfer dari ${accountLabel(input.from)}`,
      status: 'approved',
      transfer_group_id: groupId,
      source_type: 'petty_cash',
      source_id: null,
      division: toDiv,
      project_id: toPid,
    });
  } catch (err) {
    const outId = Array.isArray(outRow) ? outRow[0]?.id : outRow?.id;
    if (outId) await api.delete('petty_cash', outId).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------
// Entry point — pilih skenario otomatis berdasarkan pasangan from/to
// ---------------------------------------------------------------------
export async function executeTransfer(input: TransferInput): Promise<void> {
  if (!input.amount || input.amount <= 0) throw new Error('Jumlah harus lebih dari 0');

  // Validasi: akun sumber & tujuan tidak boleh sama
  if (input.from.kind === 'bank' && input.to.kind === 'bank' && input.from.id === input.to.id) {
    throw new Error('Rekening sumber dan tujuan tidak boleh sama');
  }
  if (input.from.kind === 'cash_besar' && input.to.kind === 'cash_besar') {
    throw new Error('Akun sumber dan tujuan tidak boleh sama');
  }
  if (input.from.kind === 'petty_cash' && input.to.kind === 'petty_cash') {
    if (pettyKey(input.from) === pettyKey(input.to)) {
      throw new Error('Dompet Petty Cash sumber dan tujuan tidak boleh sama');
    }
    return transferPettyToPetty(input);
  }

  if (input.from.kind === 'petty_cash')      return transferFromPettyCash(input);
  if (input.to.kind   === 'petty_cash')      return transferToPettyCash(input);
  return transferCashFlowToCashFlow(input);
}

// ---------------------------------------------------------------------
// Hapus transfer berpasangan via transfer_group_id.
// Aman dipanggil dari sisi mana pun (cash_flow atau petty_cash).
// ---------------------------------------------------------------------
export async function deleteTransferGroup(transferGroupId: string): Promise<void> {
  if (!transferGroupId) throw new Error('transfer_group_id kosong');

  const [cfRows, pcRows] = await Promise.all([
    api.get('cash_flow', `select=id&transfer_group_id=eq.${transferGroupId}`),
    api.get('petty_cash', `select=id&transfer_group_id=eq.${transferGroupId}`),
  ]);

  await Promise.all([
    ...cfRows.map((r: any) => api.delete('cash_flow', r.id).catch(() => {})),
    ...pcRows.map((r: any) => api.delete('petty_cash', r.id).catch(() => {})),
  ]);
}
