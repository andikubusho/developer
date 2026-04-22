-- 1. Ensure Marketing Tables Exist
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'no respon' CHECK (status IN ('no respon', 'low', 'medium', 'hot')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'no respon' CHECK (status IN ('no respon', 'low', 'medium', 'hot')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  value BIGINT NOT NULL,
  valid_until DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposits (
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

-- 2. Seed Data
-- Profiles (Marketing Team)
INSERT INTO profiles (id, full_name, role)
VALUES 
  ('00000000-0000-0000-0000-000000000010'::uuid, 'Budi Marketing', 'marketing'),
  ('00000000-0000-0000-0000-000000000011'::uuid, 'Ani Sales', 'marketing')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Projects (Ensure GA and GC exist)
INSERT INTO projects (id, name, developer, settings)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Golden Canyon', 'PT. Abadi Lestari Mandiri', '{"bunga_flat": 0.08, "dp_percentage": 0.20, "booking_fee": 15000000}'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Griya Asri', 'PT. Abadi Lestari Mandiri', '{"bunga_flat": 0.10, "dp_percentage": 0.10, "booking_fee": 5000000}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Leads
INSERT INTO leads (id, name, phone, source, status, description)
VALUES 
  ('00000000-0000-0000-0000-000000000101'::uuid, 'Rahmat Hidayat', '08123456789', 'Facebook Ads', 'hot', 'Minat unit hook di Golden Canyon'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'Siti Aminah', '08567890123', 'Instagram', 'medium', 'Tanya promo DP 0%'),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'Joko Susilo', '08998877665', 'Walk-in', 'low', 'Cuma lihat-lihat siteplan')
ON CONFLICT (id) DO NOTHING;

-- Follow Ups
INSERT INTO follow_ups (lead_id, description, status)
VALUES 
  ('00000000-0000-0000-0000-000000000101'::uuid, 'Sudah telepon, janji survey hari Minggu', 'hot'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'Kirim brosur via WA, belum dibaca', 'medium')
ON CONFLICT (id) DO NOTHING;

-- Promos
INSERT INTO promos (name, value, valid_until, description)
VALUES 
  ('Promo Lebaran Berkah', 10000000, '2026-05-30', 'Potongan harga langsung 10jt'),
  ('Free Biaya KPR', 5000000, '2026-12-31', 'Subsidi biaya akad KPR up to 5jt')
ON CONFLICT DO NOTHING;

-- Deposits
INSERT INTO deposits (name, phone, amount, payment_type, submission, description)
VALUES 
  ('Rahmat Hidayat', '08123456789', 5000000, 'bank', 'UTJ Golden Canyon', 'Booking unit GC-01')
ON CONFLICT DO NOTHING;

-- Customers
INSERT INTO customers (id, full_name, email, phone, address, identity_number)
VALUES 
  ('00000000-0000-0000-0000-000000000501'::uuid, 'Dedi Kurniawan', 'dedi@mail.com', '0811223344', 'Jl. Merdeka No. 1', '3201234567890001')
ON CONFLICT (id) DO NOTHING;
