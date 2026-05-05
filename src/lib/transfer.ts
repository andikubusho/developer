// =====================================================================
// Transfer Helper — Mekanisme transfer saldo antar akun
// Mendukung 3 skenario:
//   A. Bank/Kas Besar  ↔  Bank/Kas Besar   (2 row di cash_flow)
//   B. Bank/Kas Besar  →   Petty Cash      (1 cash_flow OUT + 1 petty_cash IN)
//   C. Petty Cash      →   Bank/Kas Besar  (1 petty_cash OUT + 1 cash_flow IN)
//
// Semua row pasangan di-link via `transfer_group_id` (UUID identik) supaya
// bisa dihapus berbarengan dan dilaporkan sebagai satu transaksi logis.
// =====================================================================

import { api } from './api';

const TRANSFER_CATEGORY = 'Transfer Antar Akun';

// Tipe identitas akun yang bisa jadi sumber/tujuan transfer
export type AccountRef =
  | { kind: 'bank'; id: string; label: string }       // Rekening bank, id = bank_accounts.id
  | { kind: 'cash_besar'; label: string }              // Kas besar (tunai), tanpa id
  | { kind: 'petty_cash'; label: string };             // Petty cash (single account)

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
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const accountLabel = (a: AccountRef): string => a.label;

// ---------------------------------------------------------------------
// Skenario A: cash_flow ↔ cash_flow
// (bank↔bank, bank↔kas_besar, kas_besar↔bank)
// ---------------------------------------------------------------------
async function transferCashFlowToCashFlow(input: TransferInput): Promise<void> {
  const groupId = uuid();
  const fromBankId = input.from.kind === 'bank' ? input.from.id : null;
  const toBankId   = input.to.kind   === 'bank' ? input.to.id   : null;
  const fromTargetType = input.from.kind === 'bank' ? 'bank' : 'cash_besar';
  const toTargetType   = input.to.kind   === 'bank' ? 'bank' : 'cash_besar';

  // OUT di akun sumber
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
    // IN di akun tujuan
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
    // Rollback row pertama agar tidak yatim
    const outId = Array.isArray(outRow) ? outRow[0]?.id : outRow?.id;
    if (outId) await api.delete('cash_flow', outId).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------
// Skenario B: Bank/Kas Besar → Petty Cash
// ---------------------------------------------------------------------
async function transferToPettyCash(input: TransferInput): Promise<void> {
  if (input.to.kind !== 'petty_cash') throw new Error('Tujuan harus Petty Cash');
  if (input.from.kind === 'petty_cash') throw new Error('Sumber tidak boleh Petty Cash di skenario ini');

  const groupId = uuid();
  const fromBankId = input.from.kind === 'bank' ? input.from.id : null;
  const fromKindForPetty = input.from.kind === 'bank' ? 'bank' : 'cash_besar';

  // 1. cash_flow OUT (uang keluar dari bank/kas besar)
  const cashRow = await api.insert('cash_flow', {
    date: input.date,
    type: 'out',
    category: TRANSFER_CATEGORY,
    description: input.description || `Transfer ke Petty Cash`,
    amount: input.amount,
    bank_account_id: fromBankId,
    status: 'verified',
    reference_type: 'transfer',
    transfer_group_id: groupId,
    transfer_target_type: 'petty_cash',
    transfer_target_id: null,
  });

  try {
    // 2. petty_cash IN (uang masuk ke kas kecil), auto-approved
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

  // 1. petty_cash OUT
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
  });

  try {
    // 2. cash_flow IN
    await api.insert('cash_flow', {
      date: input.date,
      type: 'in',
      category: TRANSFER_CATEGORY,
      description: input.description || `Setoran dari Petty Cash`,
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
// Entry point — pilih skenario otomatis berdasarkan pasangan from/to
// ---------------------------------------------------------------------
export async function executeTransfer(input: TransferInput): Promise<void> {
  if (!input.amount || input.amount <= 0) throw new Error('Jumlah harus lebih dari 0');
  if (input.from.kind === input.to.kind && input.from.kind !== 'bank') {
    throw new Error('Akun sumber dan tujuan tidak boleh sama');
  }
  if (input.from.kind === 'bank' && input.to.kind === 'bank' && input.from.id === input.to.id) {
    throw new Error('Rekening sumber dan tujuan tidak boleh sama');
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

  // Hapus semua row di kedua tabel yang punya group id sama
  const [cfRows, pcRows] = await Promise.all([
    api.get('cash_flow', `select=id&transfer_group_id=eq.${transferGroupId}`),
    api.get('petty_cash', `select=id&transfer_group_id=eq.${transferGroupId}`),
  ]);

  await Promise.all([
    ...cfRows.map((r: any) => api.delete('cash_flow', r.id).catch(() => {})),
    ...pcRows.map((r: any) => api.delete('petty_cash', r.id).catch(() => {})),
  ]);
}
