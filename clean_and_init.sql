-- 0. Clean Existing Tables (to avoid conflicts)
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS price_list_items CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS promos CASCADE;
DROP TABLE IF EXISTS marketing_schedules CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 1. Profiles Table (Linked to Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'marketing', 'owner', 'teknik', 'keuangan', 'audit', 'hrd', 'accounting')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  developer TEXT NOT NULL DEFAULT 'PT. Abadi Lestari Mandiri',
  location TEXT,
  description TEXT,
  total_units INTEGER DEFAULT 0,
  logo_url TEXT,
  settings JSONB DEFAULT '{"bunga_flat": 0.08, "dp_percentage": 0.20, "booking_fee": 15000000}'::jsonb,
  active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('planned', 'ongoing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Price List Items Table (The core for our Editor)
CREATE TABLE price_list_items (
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

-- 4. Units Table (Redundant but used by some legacy pages)
CREATE TABLE units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  type TEXT,
  price DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'sold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Customers Table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  identity_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Sales Table
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id TEXT NOT NULL, -- Link to PriceListItem unit_id
  project_id UUID REFERENCES projects(id),
  customer_id UUID REFERENCES customers(id),
  marketing_id UUID REFERENCES profiles(id),
  total_price DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  final_price DECIMAL(15,2) NOT NULL,
  booking_fee DECIMAL(15,2) DEFAULT 0,
  booking_fee_date DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'kpr', 'installment')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Leads & Follow Ups
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'no respon' CHECK (status IN ('no respon', 'low', 'medium', 'hot')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'no respon' CHECK (status IN ('no respon', 'low', 'medium', 'hot')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Promos & Marketing
CREATE TABLE promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  value BIGINT NOT NULL,
  valid_until DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount BIGINT NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('cash', 'bank')),
  submission TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SEED DATA
-- ==========================================

-- Projects
INSERT INTO projects (id, name, developer, settings)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Golden Canyon', 'PT. Abadi Lestari Mandiri', '{"bunga_flat": 0.08, "dp_percentage": 0.20, "booking_fee": 15000000}'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Griya Asri', 'PT. Abadi Lestari Mandiri', '{"bunga_flat": 0.10, "dp_percentage": 0.10, "booking_fee": 5000000}'::jsonb);

-- Marketing Team
INSERT INTO profiles (id, full_name, role, name, email)
VALUES 
  ('00000000-0000-0000-0000-000000000010'::uuid, 'Budi Marketing', 'marketing', 'budi', 'budi@mail.com'),
  ('00000000-0000-0000-0000-000000000011'::uuid, 'Ani Sales', 'marketing', 'ani', 'ani@mail.com');

-- Price List Items (Sample)
INSERT INTO price_list_items (unit_id, project_id, category, cluster, blok, unit, tipe, luas_tanah, luas_bangunan, harga_jual, booking_fee, status)
VALUES 
  ('gc-north-01', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '01', 'Bronze 7', 100, 125, 1287500000, 15000000, 'available'),
  ('gc-east-05', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '05', 'Copper 7', 105, 160, 1546733333, 15000000, 'sold');

-- Leads
INSERT INTO leads (id, name, phone, source, status, description)
VALUES 
  ('00000000-0000-0000-0000-000000000101'::uuid, 'Rahmat Hidayat', '08123456789', 'Facebook Ads', 'hot', 'Minat unit hook di Golden Canyon'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'Siti Aminah', '08567890123', 'Instagram', 'medium', 'Tanya promo DP 0%');

-- Follow Ups
INSERT INTO follow_ups (lead_id, description, status)
VALUES 
  ('00000000-0000-0000-0000-000000000101'::uuid, 'Sudah telepon, janji survey hari Minggu', 'hot');

-- Promos
INSERT INTO promos (name, value, valid_until, description)
VALUES 
  ('Promo Lebaran Berkah', 10000000, '2026-05-30', 'Potongan harga langsung 10jt');

-- Customers
INSERT INTO customers (id, full_name, email, phone, address, identity_number)
VALUES 
  ('00000000-0000-0000-0000-000000000501'::uuid, 'Dedi Kurniawan', 'dedi@mail.com', '0811223344', 'Jl. Merdeka No. 1', '3201234567890001');

-- Sales (Linking one)
INSERT INTO sales (unit_id, project_id, customer_id, marketing_id, total_price, final_price, booking_fee, status)
VALUES 
  ('gc-east-05', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 1546733333, 1546733333, 15000000, 'active');
