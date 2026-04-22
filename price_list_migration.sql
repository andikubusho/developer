-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  developer TEXT NOT NULL DEFAULT 'PT. Abadi Lestari Mandiri',
  logo_url TEXT,
  settings JSONB DEFAULT '{"bunga_flat": 0.08, "dp_percentage": 0.20, "booking_fee": 15000000}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Price List Items Table
CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'Rumah',
  cluster TEXT,
  blok TEXT NOT NULL,
  unit TEXT NOT NULL,
  tipe TEXT NOT NULL,
  luas_tanah INTEGER NOT NULL,
  luas_bangunan INTEGER NOT NULL,
  harga_jual BIGINT NOT NULL,
  booking_fee BIGINT NOT NULL,
  dp_percentage DECIMAL(5,2) DEFAULT 0.20,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sales Table (Minimal for Price List integration)
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pli_project ON price_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_pli_unit_id ON price_list_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_sales_unit_id ON sales(unit_id);

-- Insert Initial Projects
INSERT INTO projects (id, name, developer, settings)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Golden Canyon', 'PT. Abadi Lestari Mandiri', '{"bunga_flat": 0.08, "dp_percentage": 0.20, "booking_fee": 15000000}'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Griya Asri', 'PT. Abadi Lestari Mandiri', '{"bunga_flat": 0.10, "dp_percentage": 0.10, "booking_fee": 5000000}'::jsonb)
ON CONFLICT (id) DO NOTHING;
