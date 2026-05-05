-- =====================================================================
-- Migration: Expand general_journal & ledger untuk Proper Double-Entry
-- Tanggal  : 2026-05-05
-- Tujuan   : Tambah kolom yang missing supaya dua tabel ini bisa support
--            jurnal multi-line (DR=CR balanced) dan ledger detail per akun.
--            Backwards compatible — tidak menyentuh data existing.
-- =====================================================================

-- ------------------------------------------------------------
-- 1. general_journal: tambah account_code, reference_no, entry_group_id
--    - account_code: link ke chart_of_accounts.code (7-digit)
--    - reference_no: nomor bukti / referensi transaksi
--    - entry_group_id: UUID untuk grouping multi-line (1 transaksi bisa
--      banyak baris debit/credit yang harus balanced)
--    - posted_by: user yang posting
--    - source_type / source_id: link ke modul asal (cash_flow, payment, dll)
-- ------------------------------------------------------------
ALTER TABLE general_journal
  ADD COLUMN IF NOT EXISTS account_code VARCHAR(7),
  ADD COLUMN IF NOT EXISTS reference_no TEXT,
  ADD COLUMN IF NOT EXISTS entry_group_id UUID,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_gj_account     ON general_journal(account_code);
CREATE INDEX IF NOT EXISTS idx_gj_date        ON general_journal(date);
CREATE INDEX IF NOT EXISTS idx_gj_entry_group ON general_journal(entry_group_id);
CREATE INDEX IF NOT EXISTS idx_gj_reference   ON general_journal(reference_no);

COMMENT ON COLUMN general_journal.account_code   IS 'Link ke chart_of_accounts.code (7-digit)';
COMMENT ON COLUMN general_journal.entry_group_id IS 'UUID grouping multi-line dalam 1 transaksi';
COMMENT ON COLUMN general_journal.reference_no   IS 'Nomor bukti / referensi (mis. JV-2026-001, BF-001)';

-- ------------------------------------------------------------
-- 2. ledger: tambah account_code, date, debit, credit, reference_no, description
--    Tabel ledger akan jadi "buku besar transaksi" (detail per movement)
--    bukan snapshot saldo. Kolom `balance` existing tetap dipakai sebagai
--    running balance per row.
-- ------------------------------------------------------------
ALTER TABLE ledger
  ADD COLUMN IF NOT EXISTS account_code VARCHAR(7),
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS debit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_no TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES general_journal(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ledger_account   ON ledger(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_date      ON ledger(date);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger(reference_no);
CREATE INDEX IF NOT EXISTS idx_ledger_journal   ON ledger(journal_entry_id);

COMMENT ON COLUMN ledger.account_code      IS 'Link ke chart_of_accounts.code';
COMMENT ON COLUMN ledger.date              IS 'Tanggal transaksi';
COMMENT ON COLUMN ledger.debit             IS 'Nominal debit untuk row ini';
COMMENT ON COLUMN ledger.credit            IS 'Nominal credit untuk row ini';
COMMENT ON COLUMN ledger.balance           IS 'Running balance setelah row ini diposting';
COMMENT ON COLUMN ledger.journal_entry_id  IS 'Link ke general_journal sumber posting';

-- =====================================================================
-- Selesai. Setelah migrasi ini:
--   - general_journal bisa simpan multi-line per transaksi (link via entry_group_id)
--   - ledger bisa show detail transaksi per akun (debit/credit/saldo)
--   - Validasi DR=CR dilakukan di sisi aplikasi sebelum insert
-- =====================================================================
