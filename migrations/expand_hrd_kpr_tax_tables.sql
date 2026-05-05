-- =====================================================================
-- Migration: Expand tabel HRD, KPR, Pajak supaya field UI match DB
-- Tanggal  : 2026-05-05
-- Tujuan   : Tambah kolom yang dipakai UI tapi belum ada di DB.
--            Idempotent: aman dijalankan ulang. Backwards compatible.
-- =====================================================================

-- ------------------------------------------------------------
-- 1. employees: tambah employee_id, division, join_date, email, phone
-- ------------------------------------------------------------
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS division TEXT,
  ADD COLUMN IF NOT EXISTS join_date DATE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_employees_emp_id   ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_division ON employees(division);

COMMENT ON COLUMN employees.employee_id IS 'Kode karyawan custom (mis. EMP-001)';
COMMENT ON COLUMN employees.division    IS 'Divisi: Marketing | Teknik | Keuangan | Accounting | HRD | Audit';

-- ------------------------------------------------------------
-- 2. attendance: tambah check_in, check_out (waktu jam masuk/pulang)
-- ------------------------------------------------------------
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS check_in TIME,
  ADD COLUMN IF NOT EXISTS check_out TIME;

COMMENT ON COLUMN attendance.check_in  IS 'Jam masuk (HH:MM)';
COMMENT ON COLUMN attendance.check_out IS 'Jam pulang (HH:MM)';

-- ------------------------------------------------------------
-- 3. taxation: tambah description, due_date, status
--    (rate & tax_name existing di-keep; description sebagai catatan tambahan)
-- ------------------------------------------------------------
ALTER TABLE taxation
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid'));

CREATE INDEX IF NOT EXISTS idx_taxation_due_date ON taxation(due_date);
CREATE INDEX IF NOT EXISTS idx_taxation_status   ON taxation(status);

COMMENT ON COLUMN taxation.description IS 'Keterangan transaksi pajak';
COMMENT ON COLUMN taxation.due_date    IS 'Tanggal jatuh tempo pembayaran';
COMMENT ON COLUMN taxation.status      IS 'unpaid | paid';

-- ------------------------------------------------------------
-- 4. kpr_disbursement: tambah bank_name, disbursement_date, stage
-- ------------------------------------------------------------
ALTER TABLE kpr_disbursement
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS disbursement_date DATE,
  ADD COLUMN IF NOT EXISTS stage INT DEFAULT 1 CHECK (stage BETWEEN 1 AND 3);

CREATE INDEX IF NOT EXISTS idx_kpr_disb_date  ON kpr_disbursement(disbursement_date);
CREATE INDEX IF NOT EXISTS idx_kpr_disb_stage ON kpr_disbursement(stage);

COMMENT ON COLUMN kpr_disbursement.bank_name         IS 'Nama bank pencair (Mandiri, BTN, BCA, dll)';
COMMENT ON COLUMN kpr_disbursement.disbursement_date IS 'Tanggal dana cair dari bank';
COMMENT ON COLUMN kpr_disbursement.stage             IS 'Tahap pencairan: 1 (40%), 2 (50%), 3 (10%)';

-- =====================================================================
-- Selesai. Field di UI Employees, Attendance, Taxation, KPRDisbursement
-- sekarang match dengan kolom DB. Form & tabel akan jalan normal.
-- =====================================================================
