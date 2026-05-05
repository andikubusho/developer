-- =====================================================================
-- Migration: Inventaris (Alat Kerja Teknik & Aset Tetap Accounting)
-- Tanggal  : 2026-05-05
-- Tujuan   : Single tabel `assets` dengan flag asset_class untuk 2 modul UI:
--              - asset_class='tool'         → Inventaris Alat Kerja (Teknik)
--              - asset_class='fixed_asset'  → Aset Tetap (Accounting)
--            Mutasi via asset_movements; penyusutan via asset_depreciation;
--            stock opname via asset_opname + asset_opname_items.
--
-- CATATAN: FK ke `users` SENGAJA TIDAK dipakai karena di environment ini
--          tabel users (custom) belum tentu ada (auth.users dari Supabase
--          terpisah). Field user_id tetap INT, validasi di sisi aplikasi.
-- =====================================================================

-- ------------------------------------------------------------
-- 0. Bersihkan partial-created tables dari attempt sebelumnya (kalau ada)
--    Aman karena CREATE TABLE IF NOT EXISTS di bawah akan re-create.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS asset_opname_items CASCADE;
DROP TABLE IF EXISTS asset_opname CASCADE;
DROP TABLE IF EXISTS asset_depreciation CASCADE;
DROP TABLE IF EXISTS asset_movements CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

-- ------------------------------------------------------------
-- 1. Tabel assets (master)
-- ------------------------------------------------------------
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  -- Klasifikasi (driver utama)
  asset_class TEXT NOT NULL CHECK (asset_class IN ('tool', 'fixed_asset')),
  category TEXT,

  -- Identifikasi fisik
  serial_number TEXT,
  brand TEXT,
  model TEXT,

  -- Pengadaan
  acquisition_date DATE NOT NULL,
  acquisition_cost NUMERIC NOT NULL DEFAULT 0,
  supplier_name TEXT,

  -- Status & lokasi (user_id INT polos, tanpa FK)
  current_location TEXT,
  current_holder_user_id INT,
  current_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  condition TEXT NOT NULL DEFAULT 'baik'
    CHECK (condition IN ('baik','rusak_ringan','rusak_berat','hilang','disposed')),
  status TEXT NOT NULL DEFAULT 'aktif'
    CHECK (status IN ('aktif','idle','maintenance','disposed')),

  -- Field khusus fixed_asset (NULL kalau tool)
  salvage_value NUMERIC,
  useful_life_months INT,
  depreciation_method TEXT CHECK (depreciation_method IN ('straight_line','none')),
  asset_coa_code VARCHAR(7),
  accum_depr_coa_code VARCHAR(7),
  depr_expense_coa_code VARCHAR(7),

  -- Field khusus tool
  is_consumable BOOLEAN DEFAULT false,

  notes TEXT,
  photo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: fixed_asset wajib punya field penyusutan minimum
  CONSTRAINT chk_assets_fa_required CHECK (
    (asset_class = 'tool') OR
    (asset_class = 'fixed_asset' AND useful_life_months IS NOT NULL AND asset_coa_code IS NOT NULL)
  )
);

CREATE INDEX idx_assets_class     ON assets(asset_class);
CREATE INDEX idx_assets_holder    ON assets(current_holder_user_id);
CREATE INDEX idx_assets_project   ON assets(current_project_id);
CREATE INDEX idx_assets_condition ON assets(condition);
CREATE INDEX idx_assets_status    ON assets(status);
CREATE INDEX idx_assets_category  ON assets(category);

COMMENT ON COLUMN assets.asset_class IS 'tool = alat kerja Teknik; fixed_asset = aset tetap Accounting (di-depresiasi)';
COMMENT ON COLUMN assets.is_consumable IS 'Untuk tool: barang habis pakai (mata bor, sarung tangan, dll)';

-- ------------------------------------------------------------
-- 2. Tabel asset_movements (riwayat mutasi)
-- ------------------------------------------------------------
CREATE TABLE asset_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN
    ('acquire','assign','return','transfer','maintain','reclassify','dispose','opname_adjust')),

  from_location TEXT,
  to_location TEXT,
  from_holder_user_id INT,
  to_holder_user_id INT,
  from_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  from_condition TEXT,
  to_condition TEXT,
  from_class TEXT,
  to_class TEXT,

  cost NUMERIC DEFAULT 0,
  notes TEXT,

  created_by INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_mov_asset ON asset_movements(asset_id);
CREATE INDEX idx_asset_mov_date  ON asset_movements(date);
CREATE INDEX idx_asset_mov_type  ON asset_movements(type);

-- ------------------------------------------------------------
-- 3. Tabel asset_depreciation (jadwal & posting penyusutan)
-- ------------------------------------------------------------
CREATE TABLE asset_depreciation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount NUMERIC NOT NULL,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  journal_ref TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, period_year, period_month)
);

CREATE INDEX idx_depr_period  ON asset_depreciation(period_year, period_month);
CREATE INDEX idx_depr_posted  ON asset_depreciation(is_posted);

-- ------------------------------------------------------------
-- 4. Tabel asset_opname (header sesi opname)
-- ------------------------------------------------------------
CREATE TABLE asset_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_code TEXT UNIQUE NOT NULL,
  opname_date DATE NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('tool','fixed_asset','all')),
  location_filter TEXT,
  project_filter UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

CREATE INDEX idx_opname_status ON asset_opname(status);
CREATE INDEX idx_opname_date   ON asset_opname(opname_date);

-- ------------------------------------------------------------
-- 5. Tabel asset_opname_items
-- ------------------------------------------------------------
CREATE TABLE asset_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES asset_opname(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

  expected_location TEXT,
  expected_holder_user_id INT,
  expected_condition TEXT,

  actual_location TEXT,
  actual_holder_user_id INT,
  actual_condition TEXT,
  is_found BOOLEAN DEFAULT true,

  variance_type TEXT,
  notes TEXT,

  UNIQUE(opname_id, asset_id)
);

CREATE INDEX idx_opname_items_opname   ON asset_opname_items(opname_id);
CREATE INDEX idx_opname_items_variance ON asset_opname_items(variance_type);

-- =====================================================================
-- Selesai. Tabel inventaris siap dipakai oleh modul:
--   - Teknik: /asset-tools (filter asset_class='tool')
--   - Accounting: /fixed-assets (filter asset_class='fixed_asset')
-- =====================================================================
