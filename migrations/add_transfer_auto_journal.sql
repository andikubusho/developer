-- =====================================================================
-- Migration: Auto-Journal untuk Transfer Antar Akun + Biaya Admin Bank
-- Tanggal  : 2026-05-06
-- Tujuan   :
--   1. Tambah kolom `coa_code` di bank_accounts (link ke chart_of_accounts).
--   2. Auto-seed coa_code utk bank existing berdasarkan nama bank.
--   3. Helper akun: fn_get_cashflow_coa() & fn_get_petty_coa().
--   4. fn_propose_transfer_journal() — bangun 1 entri journal_pending
--      multi-line per transfer_group_id (transfer pokok + biaya admin),
--      idempotent (UPSERT).
--   5. Trigger AFTER INSERT/UPDATE/DELETE pada cash_flow & petty_cash
--      untuk auto-stage saat transfer_group_id terisi.
--   6. fn_backfill_transfer_journals() — stage data transfer lama.
--
-- Asumsi : tabel `journal_pending` sudah ada (dibuat oleh migration
--          auto-journal sebelumnya) dengan kolom: id, source_type,
--          source_id, reference_no, transaction_date, description,
--          proposed_lines (JSONB), total_debit, total_credit,
--          trigger_reason, status, detected_at, error_message.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Mapping COA di tabel bank_accounts
-- ---------------------------------------------------------------------
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS coa_code VARCHAR(7);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_coa_code_fkey'
  ) THEN
    ALTER TABLE bank_accounts
      ADD CONSTRAINT bank_accounts_coa_code_fkey
      FOREIGN KEY (coa_code) REFERENCES chart_of_accounts(code) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_coa ON bank_accounts(coa_code);

COMMENT ON COLUMN bank_accounts.coa_code IS 'Link ke chart_of_accounts.code; akun GL dari rekening bank ini.';

-- ---------------------------------------------------------------------
-- 2. Auto-seed coa_code utk bank lama (best-effort by nama)
-- ---------------------------------------------------------------------
UPDATE bank_accounts SET coa_code = '1110011'
  WHERE coa_code IS NULL AND bank_name ILIKE '%bca%';
UPDATE bank_accounts SET coa_code = '1110012'
  WHERE coa_code IS NULL AND bank_name ILIKE '%bni%';
UPDATE bank_accounts SET coa_code = '1110013'
  WHERE coa_code IS NULL AND bank_name ILIKE '%mandiri%';

-- ---------------------------------------------------------------------
-- 3. Helper akun
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_cashflow_coa(p_bank_account_id UUID)
RETURNS VARCHAR AS $$
DECLARE v_code VARCHAR(7);
BEGIN
  IF p_bank_account_id IS NULL THEN
    RETURN '1110001';  -- Kas Besar (Tunai)
  END IF;
  SELECT coa_code INTO v_code FROM bank_accounts WHERE id = p_bank_account_id;
  RETURN COALESCE(v_code, '1110011');  -- fallback Bank BCA generik
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_get_petty_coa(p_division TEXT)
RETURNS VARCHAR AS $$
BEGIN
  IF p_division = 'teknik' THEN RETURN '1110003'; END IF;
  RETURN '1110002';  -- Petty Cash Keuangan
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------
-- 4. Fungsi utama: stage 1 entri journal_pending per transfer_group_id
--    Dipanggil oleh trigger maupun backfill.
--    Idempotent: UPSERT berdasarkan (source_type, source_id).
--    Skip kalau group belum lengkap (harus ada minimal 1 IN dan 1 OUT).
--    Skip kalau pending sudah berstatus 'posted'.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_propose_transfer_journal(p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  v_lines        JSONB := '[]'::JSONB;
  v_total_debit  NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_date         DATE;
  v_description  TEXT := '';
  v_existing_id  UUID;
  v_existing_st  TEXT;
  v_has_in       BOOLEAN := false;
  v_has_out      BOOLEAN := false;
  v_pending_id   UUID;
  rec            RECORD;
BEGIN
  IF p_group_id IS NULL THEN RETURN NULL; END IF;

  -- Cek pending existing
  SELECT id, status INTO v_existing_id, v_existing_st
    FROM journal_pending
   WHERE source_type = 'transfer' AND source_id = p_group_id::TEXT
   LIMIT 1;

  IF v_existing_st = 'posted' THEN
    RETURN v_existing_id;
  END IF;

  -- Tanggal & deskripsi diambil dari sisi OUT (sumber)
  SELECT cf.date, cf.description INTO v_date, v_description
    FROM cash_flow cf
   WHERE cf.transfer_group_id = p_group_id
     AND cf.reference_type = 'transfer' AND cf.type = 'out'
   ORDER BY cf.created_at NULLS LAST, cf.id LIMIT 1;

  IF v_date IS NULL THEN
    SELECT pc.date, pc.description INTO v_date, v_description
      FROM petty_cash pc
     WHERE pc.transfer_group_id = p_group_id
       AND pc.type = 'out'
     ORDER BY pc.created_at NULLS LAST, pc.id LIMIT 1;
  END IF;

  IF v_date IS NULL THEN
    -- Belum ada row OUT → group masih belum lengkap, batal stage
    IF v_existing_id IS NOT NULL AND v_existing_st = 'pending' THEN
      DELETE FROM journal_pending WHERE id = v_existing_id;
    END IF;
    RETURN NULL;
  END IF;

  -- 4a. Cash flow rows (transfer pokok)
  FOR rec IN
    SELECT
      fn_get_cashflow_coa(cf.bank_account_id) AS account_code,
      CASE WHEN cf.type='in'  THEN cf.amount ELSE 0 END AS debit,
      CASE WHEN cf.type='out' THEN cf.amount ELSE 0 END AS credit,
      cf.description AS desc_,
      cf.type AS rtype
    FROM cash_flow cf
    WHERE cf.transfer_group_id = p_group_id
      AND cf.reference_type = 'transfer'
  LOOP
    v_lines := v_lines || jsonb_build_object(
      'account_code', rec.account_code,
      'debit', rec.debit,
      'credit', rec.credit,
      'description', rec.desc_
    );
    v_total_debit  := v_total_debit  + rec.debit;
    v_total_credit := v_total_credit + rec.credit;
    IF rec.rtype = 'in'  THEN v_has_in  := true; END IF;
    IF rec.rtype = 'out' THEN v_has_out := true; END IF;
  END LOOP;

  -- 4b. Petty cash rows
  FOR rec IN
    SELECT
      fn_get_petty_coa(pc.division) AS account_code,
      CASE WHEN pc.type='in'  THEN pc.amount ELSE 0 END AS debit,
      CASE WHEN pc.type='out' THEN pc.amount ELSE 0 END AS credit,
      pc.description AS desc_,
      pc.type AS rtype
    FROM petty_cash pc
    WHERE pc.transfer_group_id = p_group_id
  LOOP
    v_lines := v_lines || jsonb_build_object(
      'account_code', rec.account_code,
      'debit', rec.debit,
      'credit', rec.credit,
      'description', rec.desc_
    );
    v_total_debit  := v_total_debit  + rec.debit;
    v_total_credit := v_total_credit + rec.credit;
    IF rec.rtype = 'in'  THEN v_has_in  := true; END IF;
    IF rec.rtype = 'out' THEN v_has_out := true; END IF;
  END LOOP;

  -- 4c. Cash flow rows (BIAYA ADMIN BANK)
  --     Setiap row fee → 2 line: D Beban Admin / C Bank Sumber
  FOR rec IN
    SELECT
      fn_get_cashflow_coa(cf.bank_account_id) AS source_acc,
      cf.amount AS amt,
      cf.description AS desc_
    FROM cash_flow cf
    WHERE cf.transfer_group_id = p_group_id
      AND cf.reference_type = 'transfer_fee'
  LOOP
    v_lines := v_lines || jsonb_build_object(
      'account_code', '6300002',
      'debit', rec.amt,
      'credit', 0,
      'description', COALESCE(rec.desc_, 'Biaya admin transfer bank')
    );
    v_lines := v_lines || jsonb_build_object(
      'account_code', rec.source_acc,
      'debit', 0,
      'credit', rec.amt,
      'description', COALESCE(rec.desc_, 'Pengurangan kas akibat biaya admin')
    );
    v_total_debit  := v_total_debit  + rec.amt;
    v_total_credit := v_total_credit + rec.amt;
  END LOOP;

  -- Group belum balanced (mis. baru OUT, belum IN) → jangan stage
  IF NOT (v_has_in AND v_has_out) THEN
    IF v_existing_id IS NOT NULL AND v_existing_st = 'pending' THEN
      DELETE FROM journal_pending WHERE id = v_existing_id;
    END IF;
    RETURN NULL;
  END IF;

  -- UPSERT
  IF v_existing_id IS NOT NULL THEN
    UPDATE journal_pending SET
      transaction_date = v_date,
      description      = COALESCE(v_description, 'Transfer Antar Akun'),
      proposed_lines   = v_lines,
      total_debit      = v_total_debit,
      total_credit     = v_total_credit,
      trigger_reason   = 'transfer_updated',
      detected_at      = now(),
      error_message    = NULL,
      status           = 'pending'
    WHERE id = v_existing_id;
    v_pending_id := v_existing_id;
  ELSE
    INSERT INTO journal_pending (
      source_type, source_id, reference_no, transaction_date,
      description, proposed_lines, total_debit, total_credit,
      trigger_reason, status, detected_at
    ) VALUES (
      'transfer',
      p_group_id::TEXT,
      'TRF-' || LEFT(REPLACE(p_group_id::TEXT, '-', ''), 8),
      v_date,
      COALESCE(v_description, 'Transfer Antar Akun'),
      v_lines,
      v_total_debit,
      v_total_credit,
      'transfer_inserted',
      'pending',
      now()
    ) RETURNING id INTO v_pending_id;
  END IF;

  RETURN v_pending_id;
EXCEPTION WHEN OTHERS THEN
  -- Jangan gagalkan transaksi induk
  RAISE WARNING 'fn_propose_transfer_journal failed for %: %', p_group_id, SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 5. Trigger function & triggers
--    Saat sumber transfer dihapus:
--      - Kalau pending masih 'pending'  → tandai 'cancelled'
--      - Kalau sudah 'posted'           → hapus general_journal entries
--                                         (ledger ikut via ON DELETE CASCADE),
--                                         lalu tandai pending 'cancelled'
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_transfer_journal()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_id     UUID;
  v_pending_status TEXT;
  v_ref            TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.transfer_group_id IS NOT NULL THEN
      SELECT id, status, reference_no
        INTO v_pending_id, v_pending_status, v_ref
        FROM journal_pending
       WHERE source_type = 'transfer'
         AND source_id   = OLD.transfer_group_id::TEXT
       LIMIT 1;

      -- Kalau sudah posted → hapus general_journal & ledger (via cascade FK)
      IF v_pending_status = 'posted' THEN
        DELETE FROM general_journal
         WHERE source_type = 'transfer'
           AND source_id   = OLD.transfer_group_id;
        -- Fallback: match via reference_no kalau posting fn tidak set source_*
        IF v_ref IS NOT NULL THEN
          DELETE FROM general_journal WHERE reference_no = v_ref;
        END IF;
      END IF;

      -- Tandai pending sebagai cancelled (apapun status lamanya)
      UPDATE journal_pending
         SET status = 'cancelled',
             error_message = 'Source transfer dihapus',
             detected_at = now()
       WHERE id = v_pending_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.transfer_group_id IS NOT NULL THEN
    PERFORM fn_propose_transfer_journal(NEW.transfer_group_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cash_flow_transfer_journal ON cash_flow;
CREATE TRIGGER trg_cash_flow_transfer_journal
  AFTER INSERT OR UPDATE OR DELETE ON cash_flow
  FOR EACH ROW EXECUTE FUNCTION fn_trg_transfer_journal();

DROP TRIGGER IF EXISTS trg_petty_cash_transfer_journal ON petty_cash;
CREATE TRIGGER trg_petty_cash_transfer_journal
  AFTER INSERT OR UPDATE OR DELETE ON petty_cash
  FOR EACH ROW EXECUTE FUNCTION fn_trg_transfer_journal();

-- ---------------------------------------------------------------------
-- 6. Backfill data lama
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_backfill_transfer_journals()
RETURNS TABLE(group_id UUID, pending_id UUID) AS $$
DECLARE
  rec RECORD;
  v_pending UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT transfer_group_id AS gid
      FROM cash_flow
     WHERE transfer_group_id IS NOT NULL
    UNION
    SELECT DISTINCT transfer_group_id
      FROM petty_cash
     WHERE transfer_group_id IS NOT NULL
  LOOP
    v_pending := fn_propose_transfer_journal(rec.gid);
    group_id := rec.gid; pending_id := v_pending; RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- CATATAN PENTING:
--   Jika sudah ada trigger LAIN di cash_flow yg auto-stage journal
--   (mis. utk transaksi non-transfer), pastikan trigger tsb meng-skip
--   row dgn `transfer_group_id IS NOT NULL`, agar tidak double-staging.
--
-- Verifikasi:
--   SELECT * FROM journal_pending WHERE source_type='transfer'
--    ORDER BY detected_at DESC LIMIT 10;
--
-- Backfill manual (sekali jalan utk data lama):
--   SELECT * FROM fn_backfill_transfer_journals();
-- =====================================================================
