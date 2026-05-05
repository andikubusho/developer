-- =====================================================================
-- Migration: Tambah Mekanisme Transfer Antar Akun (Bank ↔ Kas Besar ↔ Petty Cash)
-- Tanggal  : 2026-05-05
-- Tujuan   : Mendukung pencatatan transfer saldo antar akun secara berpasangan.
--            Setiap transfer melibatkan 2 row (di cash_flow atau cash_flow + petty_cash)
--            yang di-link via transfer_group_id sehingga bisa dihapus berbarengan.
-- =====================================================================

-- ------------------------------------------------------------
-- 1. cash_flow: kolom untuk identifikasi transfer
-- ------------------------------------------------------------
ALTER TABLE cash_flow
  ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
  ADD COLUMN IF NOT EXISTS transfer_target_type TEXT
    CHECK (transfer_target_type IN ('bank', 'cash_besar', 'petty_cash')),
  ADD COLUMN IF NOT EXISTS transfer_target_id UUID;

CREATE INDEX IF NOT EXISTS idx_cash_flow_transfer_group
  ON cash_flow(transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;

-- ------------------------------------------------------------
-- 2. petty_cash: kolom untuk identifikasi transfer
-- ------------------------------------------------------------
ALTER TABLE petty_cash
  ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
  ADD COLUMN IF NOT EXISTS source_type TEXT
    CHECK (source_type IN ('manual', 'bank', 'cash_besar')),
  ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE INDEX IF NOT EXISTS idx_petty_cash_transfer_group
  ON petty_cash(transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Set default source_type='manual' untuk data lama
-- ------------------------------------------------------------
UPDATE petty_cash
   SET source_type = 'manual'
 WHERE source_type IS NULL;

-- ------------------------------------------------------------
-- 4. Komentar dokumentasi (opsional, mempermudah audit)
-- ------------------------------------------------------------
COMMENT ON COLUMN cash_flow.transfer_group_id  IS 'UUID grup transfer; sama di kedua sisi pasangan';
COMMENT ON COLUMN cash_flow.transfer_target_type IS 'Jenis akun pasangan: bank | cash_besar | petty_cash';
COMMENT ON COLUMN cash_flow.transfer_target_id   IS 'ID bank_account atau row petty_cash pasangan';
COMMENT ON COLUMN petty_cash.transfer_group_id IS 'UUID grup transfer; sama dengan row cash_flow pasangan';
COMMENT ON COLUMN petty_cash.source_type       IS 'Sumber dana: manual | bank | cash_besar';
COMMENT ON COLUMN petty_cash.source_id         IS 'ID bank_account asal saat source_type=bank';

-- =====================================================================
-- Selesai. Jalankan ini di Supabase SQL Editor.
-- =====================================================================
