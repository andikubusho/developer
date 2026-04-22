-- Data Seed for Golden Canyon (00000000-0000-0000-0000-000000000001)

-- 1. Ruko Section
INSERT INTO price_list_items (unit_id, project_id, category, blok, unit, tipe, luas_tanah, luas_bangunan, harga_jual, booking_fee, status)
VALUES 
  ('gc-ruko-01', '00000000-0000-0000-0000-000000000001', 'Ruko', 'GC', '01', 'Grand', 95, 125, 1470375000, 15000000, 'available'),
  ('gc-ruko-02-17', '00000000-0000-0000-0000-000000000001', 'Ruko', 'GC', '02-17', 'Grand', 68, 125, 1331775000, 15000000, 'available'),
  ('gc-ruko-18', '00000000-0000-0000-0000-000000000001', 'Ruko', 'GC', '18', 'Grand', 100, 125, 1496041667, 15000000, 'available')
ON CONFLICT (unit_id) DO NOTHING;

-- 2. Rumah Section - Cluster East
INSERT INTO price_list_items (unit_id, project_id, category, cluster, blok, unit, tipe, luas_tanah, luas_bangunan, harga_jual, booking_fee, status)
VALUES 
  ('gc-east-01', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '01', 'Copper 7', 152, 160, 1788000000, 15000000, 'available'),
  ('gc-east-02-03', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '02-03', 'Copper 7', 105, 160, 1546733333, 15000000, 'available'),
  ('gc-east-05', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '05', 'Copper 7', 105, 160, 1546733333, 15000000, 'sold'),
  ('gc-east-06', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '06', 'Black 8', 120, 195, 1857300000, 15000000, 'available'),
  ('gc-east-07-08', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '07-08', 'Black 8', 120, 195, 1857300000, 15000000, 'sold'),
  ('gc-east-09', '00000000-0000-0000-0000-000000000001', 'Rumah', 'East', '01', '09', 'Black 8', 141, 195, 2000000000, 15000000, 'sold')
ON CONFLICT (unit_id) DO NOTHING;

-- 3. Rumah Section - Cluster South
INSERT INTO price_list_items (unit_id, project_id, category, cluster, blok, unit, tipe, luas_tanah, luas_bangunan, harga_jual, booking_fee, status)
VALUES 
  ('gc-south-02', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '02', 'Black 8', 126, 195, 1880000000, 15000000, 'sold'),
  ('gc-south-03', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '03', 'Black 8', 130, 195, 1908633333, 15000000, 'available'),
  ('gc-south-05', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '05', 'Black 8', 129, 195, 1903500000, 15000000, 'available'),
  ('gc-south-06', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '06', 'Black 8', 125, 195, 1882966667, 15000000, 'available'),
  ('gc-south-07', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '07', 'Copper 7', 106, 160, 1550000000, 15000000, 'sold'),
  ('gc-south-08', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '08', 'Copper 7', 104, 160, 1541600000, 15000000, 'available'),
  ('gc-south-09-11', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '09-11', 'Copper 7', 105, 160, 1546733333, 15000000, 'available'),
  ('gc-south-12', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '12', 'Copper 7', 89, 160, 1464600000, 15000000, 'available'),
  ('gc-south-14', '00000000-0000-0000-0000-000000000001', 'Rumah', 'South', '01', '14', 'Black 8', 111, 195, 1811100000, 15000000, 'available')
ON CONFLICT (unit_id) DO NOTHING;

-- 4. Rumah Section - Cluster North
INSERT INTO price_list_items (unit_id, project_id, category, cluster, blok, unit, tipe, luas_tanah, luas_bangunan, harga_jual, booking_fee, status)
VALUES 
  ('gc-north-01', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '01', 'Bronze 7', 100, 125, 1287500000, 15000000, 'available'),
  ('gc-north-02-06', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '02-06', 'Onyx 6', 90, 105, 1102700000, 15000000, 'available'),
  ('gc-north-07-10', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '07-10', 'Ruby 6', 90, 135, 1302900000, 15000000, 'available'),
  ('gc-north-11', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '11', 'Ruby 6', 90, 135, 1302900000, 15000000, 'sold'),
  ('gc-north-12', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '12', 'Copper 7', 138, 160, 1600000000, 15000000, 'sold'),
  ('gc-north-14-17', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '14-17', 'Copper 7', 105, 160, 1546733333, 15000000, 'available'),
  ('gc-north-18', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '18', 'Copper 7', 105, 160, 1546733333, 15000000, 'sold'),
  ('gc-north-19', '00000000-0000-0000-0000-000000000001', 'Rumah', 'North', '01', '19', 'Black 8', 166, 195, 2093433333, 15000000, 'available')
ON CONFLICT (unit_id) DO NOTHING;

-- 5. Insert Sales for SOLD units (to support Auto-SOLD logic)
INSERT INTO sales (unit_id, project_id, status, total_price, final_price, booking_fee)
SELECT unit_id, project_id, 'active', harga_jual, harga_jual, booking_fee
FROM price_list_items 
WHERE status = 'sold';
