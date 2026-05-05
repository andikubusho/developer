-- =====================================================================
-- Migration: Tabel Recruitment (Manajemen Kandidat & Proses Seleksi)
-- Tanggal  : 2026-05-05
-- Tujuan   : Mendukung modul Recruitment HRD untuk catat kandidat,
--            track status seleksi, dan auto-promote ke employees saat hired.
--
-- CATATAN: Idempotent. Aman dijalankan di kondisi:
--   - Tabel belum ada → CREATE
--   - Tabel sudah ada (struktur lama/parsial) → ALTER ADD missing columns
-- =====================================================================

-- ------------------------------------------------------------
-- 1. Buat tabel minimal kalau belum ada (PK + 2 kolom wajib)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruitment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  position TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 2. Tambah semua kolom (idempotent — skip kalau sudah ada)
-- ------------------------------------------------------------
ALTER TABLE recruitment
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS interview_date DATE,
  ADD COLUMN IF NOT EXISTS interview_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hired_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------
-- 3. Tambah CHECK constraint untuk status (drop dulu kalau ada)
-- ------------------------------------------------------------
ALTER TABLE recruitment DROP CONSTRAINT IF EXISTS recruitment_status_check;
ALTER TABLE recruitment ADD CONSTRAINT recruitment_status_check
  CHECK (status IN ('applied','screening','interview','offering','hired','rejected'));

-- ------------------------------------------------------------
-- 4. Index (sekarang aman karena kolom sudah ada)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_recruitment_status   ON recruitment(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_position ON recruitment(position);
CREATE INDEX IF NOT EXISTS idx_recruitment_applied  ON recruitment(applied_date);

-- ------------------------------------------------------------
-- 5. Komentar dokumentasi
-- ------------------------------------------------------------
COMMENT ON COLUMN recruitment.status         IS 'applied → screening → interview → offering → hired/rejected';
COMMENT ON COLUMN recruitment.employee_id    IS 'Diisi saat status=hired, link ke baris employees';
COMMENT ON COLUMN recruitment.cv_url         IS 'URL CV (bisa Supabase Storage atau link external)';

-- =====================================================================
-- Selesai. Jalankan di Supabase SQL Editor.
-- =====================================================================
