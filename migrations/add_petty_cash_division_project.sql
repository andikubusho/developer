-- =====================================================================
-- Migration: Petty Cash Multi-Divisi & Per-Proyek
-- Tanggal  : 2026-05-05
-- Tujuan   : Memisahkan saldo Petty Cash per divisi (keuangan/teknik) dan
--            per proyek untuk divisi teknik. Plus dukungan transfer antar
--            petty cash (skenario D) dengan menambah 'petty_cash' ke
--            allowed value source_type.
-- =====================================================================

-- ------------------------------------------------------------
-- 1. Kolom division & project_id di petty_cash
-- ------------------------------------------------------------
ALTER TABLE petty_cash
  ADD COLUMN IF NOT EXISTS division TEXT NOT NULL DEFAULT 'keuangan'
    CHECK (division IN ('keuangan', 'teknik')),
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 2. Constraint: division=teknik wajib punya project_id
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_petty_division_project'
  ) THEN
    ALTER TABLE petty_cash ADD CONSTRAINT chk_petty_division_project
      CHECK (
        (division = 'keuangan') OR
        (division = 'teknik' AND project_id IS NOT NULL)
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Index untuk query saldo per dompet
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_petty_cash_division_project
  ON petty_cash(division, project_id);

-- ------------------------------------------------------------
-- 4. Tambah 'petty_cash' ke source_type CHECK supaya transfer
--    antar petty cash (skenario D) valid.
-- ------------------------------------------------------------
ALTER TABLE petty_cash DROP CONSTRAINT IF EXISTS petty_cash_source_type_check;
ALTER TABLE petty_cash ADD CONSTRAINT petty_cash_source_type_check
  CHECK (source_type IN ('manual', 'bank', 'cash_besar', 'petty_cash'));

-- ------------------------------------------------------------
-- 5. Tambah 'petty_cash' ke transfer_target_type cash_flow CHECK
--    (untuk konsistensi, walau pasangan tidak melibatkan cash_flow
--    saat skenario D, ini siap untuk laporan konsolidasi).
-- ------------------------------------------------------------
ALTER TABLE cash_flow DROP CONSTRAINT IF EXISTS cash_flow_transfer_target_type_check;
ALTER TABLE cash_flow ADD CONSTRAINT cash_flow_transfer_target_type_check
  CHECK (transfer_target_type IN ('bank', 'cash_besar', 'petty_cash'));

-- ------------------------------------------------------------
-- 6. Komentar dokumentasi
-- ------------------------------------------------------------
COMMENT ON COLUMN petty_cash.division   IS 'Divisi pemilik dompet: keuangan | teknik';
COMMENT ON COLUMN petty_cash.project_id IS 'Wajib jika division=teknik; NULL untuk keuangan';

-- =====================================================================
-- Selesai. Jalankan ini di Supabase SQL Editor SETELAH
-- migrasi add_transfer_links.sql.
-- =====================================================================
