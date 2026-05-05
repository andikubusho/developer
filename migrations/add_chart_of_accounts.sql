-- =====================================================================
-- Migration: Master Akun (Chart of Accounts) - Format 7 Digit
-- Tanggal  : 2026-05-05
-- Tujuan   : Menyediakan bagan akun standar untuk developer properti
--            dengan struktur hierarki 5 level dan kode 7-digit.
--            Idempotent: aman dijalankan ulang.
-- =====================================================================

-- ------------------------------------------------------------
-- 1. Skema tabel
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(7) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN
    ('asset','liability','equity','revenue','expense','other_income','other_expense')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit','credit')),
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  level INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  is_postable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_coa_code_format CHECK (code ~ '^[0-9]{7}$')
);

CREATE INDEX IF NOT EXISTS idx_coa_code     ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_coa_parent   ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_type     ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_postable ON chart_of_accounts(is_postable, is_active);

COMMENT ON COLUMN chart_of_accounts.code           IS 'Kode 7-digit numerik, mis. 1110001';
COMMENT ON COLUMN chart_of_accounts.normal_balance IS 'Saldo normal: debit (Aset/Beban) atau credit (Liabilitas/Ekuitas/Pendapatan)';
COMMENT ON COLUMN chart_of_accounts.is_postable    IS 'true = boleh dijurnal langsung; false = header (hanya rekap)';
COMMENT ON COLUMN chart_of_accounts.is_system      IS 'true = akun inti sistem, tidak boleh dihapus user';

-- ------------------------------------------------------------
-- 2. Seed: insert semua akun (parent_id=NULL dulu, di-resolve di langkah 3)
--    Pakai ON CONFLICT (code) DO NOTHING agar idempotent.
-- ------------------------------------------------------------
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, is_postable, is_system) VALUES
-- ============ 1XXXXXX ASET ============
('1000000','ASET','asset','debit',1,false,true),
  ('1100000','Aset Lancar','asset','debit',2,false,true),
    ('1110000','Kas & Setara Kas','asset','debit',3,false,true),
      ('1110001','Kas Besar','asset','debit',5,true,true),
      ('1110002','Petty Cash Keuangan','asset','debit',5,true,true),
      ('1110003','Petty Cash Teknik','asset','debit',5,true,true),
      ('1110011','Bank BCA','asset','debit',5,true,false),
      ('1110012','Bank BNI','asset','debit',5,true,false),
      ('1110013','Bank Mandiri','asset','debit',5,true,false),
    ('1120000','Piutang Usaha','asset','debit',3,false,false),
      ('1120001','Piutang Konsumen (Cicilan)','asset','debit',5,true,false),
      ('1120002','Piutang KPR (Belum Cair)','asset','debit',5,true,false),
      ('1120003','Piutang Booking Fee','asset','debit',5,true,false),
      ('1120099','Cadangan Kerugian Piutang','asset','credit',5,true,false),
    ('1130000','Persediaan Properti','asset','debit',3,false,false),
      ('1130100','Tanah','asset','debit',4,false,false),
        ('1130101','Tanah Mentah (Belum Diolah)','asset','debit',5,true,false),
        ('1130102','Tanah Kavling Siap Bangun','asset','debit',5,true,false),
      ('1130200','Bangunan','asset','debit',4,false,false),
        ('1130201','Rumah Dalam Pembangunan (WIP)','asset','debit',5,true,false),
        ('1130202','Unit Selesai Belum Terjual','asset','debit',5,true,false),
    ('1140000','Uang Muka & Biaya Dibayar Dimuka','asset','debit',3,false,false),
      ('1140001','Uang Muka Supplier','asset','debit',5,true,false),
      ('1140002','Uang Muka Kontraktor','asset','debit',5,true,false),
      ('1140003','Sewa Dibayar Dimuka','asset','debit',5,true,false),
      ('1140004','PPN Masukan','asset','debit',5,true,false),
  ('1200000','Aset Tetap','asset','debit',2,false,false),
    ('1210000','Tanah Operasional','asset','debit',3,false,false),
      ('1210001','Tanah Kantor','asset','debit',5,true,false),
    ('1220000','Bangunan & Kantor','asset','debit',3,false,false),
      ('1220001','Bangunan Kantor','asset','debit',5,true,false),
    ('1230000','Kendaraan','asset','debit',3,false,false),
      ('1230001','Kendaraan Operasional','asset','debit',5,true,false),
    ('1240000','Peralatan & Mesin','asset','debit',3,false,false),
      ('1240001','Peralatan Proyek','asset','debit',5,true,false),
    ('1250000','Inventaris Kantor','asset','debit',3,false,false),
      ('1250001','Inventaris Kantor','asset','debit',5,true,false),
    ('1290000','Akumulasi Penyusutan','asset','credit',3,false,false),
      ('1290001','Akum. Penyusutan Bangunan','asset','credit',5,true,false),
      ('1290002','Akum. Penyusutan Kendaraan','asset','credit',5,true,false),
      ('1290003','Akum. Penyusutan Peralatan','asset','credit',5,true,false),

-- ============ 2XXXXXX LIABILITAS ============
('2000000','LIABILITAS','liability','credit',1,false,true),
  ('2100000','Liabilitas Jangka Pendek','liability','credit',2,false,true),
    ('2110000','Hutang Usaha','liability','credit',3,false,false),
      ('2110001','Hutang Supplier Material','liability','credit',5,true,false),
      ('2110002','Hutang Subkontraktor / SPK','liability','credit',5,true,false),
    ('2120000','Hutang Pajak','liability','credit',3,false,false),
      ('2120001','PPh 21 Karyawan','liability','credit',5,true,false),
      ('2120002','PPh Final 4(2) Pengalihan Properti','liability','credit',5,true,false),
      ('2120003','PPN Keluaran','liability','credit',5,true,false),
      ('2120004','PBB Terutang','liability','credit',5,true,false),
    ('2130000','Hutang Karyawan','liability','credit',3,false,false),
      ('2130001','Hutang Gaji','liability','credit',5,true,false),
      ('2130002','Hutang BPJS & Tunjangan','liability','credit',5,true,false),
    ('2140000','Penerimaan Dimuka Konsumen','liability','credit',3,false,false),
      ('2140001','Booking Fee Diterima','liability','credit',5,true,false),
      ('2140002','Uang Muka / DP Konsumen','liability','credit',5,true,false),
  ('2200000','Liabilitas Jangka Panjang','liability','credit',2,false,false),
    ('2210000','Hutang Bank','liability','credit',3,false,false),
      ('2210001','Hutang Bank Konstruksi','liability','credit',5,true,false),
      ('2210002','Hutang KPR Talangan','liability','credit',5,true,false),
    ('2290000','Hutang Pemegang Saham','liability','credit',3,false,false),
      ('2290001','Hutang Pemegang Saham','liability','credit',5,true,false),

-- ============ 3XXXXXX EKUITAS ============
('3000000','EKUITAS','equity','credit',1,false,true),
  ('3100000','Modal','equity','credit',2,false,true),
    ('3100001','Modal Disetor','equity','credit',5,true,true),
    ('3100002','Tambahan Modal Disetor','equity','credit',5,true,false),
  ('3200000','Saldo Laba','equity','credit',2,false,true),
    ('3200001','Saldo Laba Ditahan','equity','credit',5,true,true),
    ('3200002','Laba Tahun Berjalan','equity','credit',5,true,true),
  ('3300000','Prive','equity','debit',2,false,false),
    ('3300001','Prive / Penarikan Pemilik','equity','debit',5,true,false),

-- ============ 4XXXXXX PENDAPATAN USAHA ============
('4000000','PENDAPATAN USAHA','revenue','credit',1,false,true),
  ('4100000','Penjualan Properti','revenue','credit',2,false,true),
    ('4100001','Penjualan Unit Rumah','revenue','credit',5,true,true),
    ('4100002','Penjualan Tanah Kavling','revenue','credit',5,true,false),
  ('4200000','Pendapatan Tambahan','revenue','credit',2,false,false),
    ('4200001','Pekerjaan Tambahan (Add-on)','revenue','credit',5,true,false),
    ('4200002','Pendapatan Administrasi & Provisi','revenue','credit',5,true,false),
  ('4300000','Pendapatan Bunga Cicilan','revenue','credit',2,false,false),
    ('4300001','Bunga Cicilan Konsumen','revenue','credit',5,true,false),

-- ============ 5XXXXXX HARGA POKOK PENJUALAN ============
('5000000','HARGA POKOK PENJUALAN','expense','debit',1,false,true),
  ('5100000','HPP Tanah','expense','debit',2,false,true),
    ('5100001','HPP Tanah Terjual','expense','debit',5,true,false),
  ('5200000','HPP Konstruksi','expense','debit',2,false,true),
    ('5210000','Material Bangunan','expense','debit',3,false,false),
      ('5210001','Bahan Pondasi & Struktur','expense','debit',5,true,false),
      ('5210002','Bahan Dinding & Plesteran','expense','debit',5,true,false),
      ('5210003','Bahan Atap & Plafon','expense','debit',5,true,false),
      ('5210004','Bahan Lantai & Keramik','expense','debit',5,true,false),
      ('5210005','Bahan Pintu & Jendela','expense','debit',5,true,false),
      ('5210006','Bahan Sanitair & Plumbing','expense','debit',5,true,false),
      ('5210007','Bahan Listrik & Lampu','expense','debit',5,true,false),
      ('5210008','Bahan Cat & Finishing','expense','debit',5,true,false),
      ('5210099','Bahan Lain-lain','expense','debit',5,true,false),
    ('5220000','Tenaga Kerja','expense','debit',3,false,false),
      ('5220001','Upah Tukang','expense','debit',5,true,false),
      ('5220002','Upah Mandor','expense','debit',5,true,false),
      ('5220003','Upah Helper','expense','debit',5,true,false),
    ('5230000','Borongan & Subkontraktor','expense','debit',3,false,false),
      ('5230001','Borongan SPK Konstruksi','expense','debit',5,true,false),
      ('5230002','Subkontraktor Spesialis','expense','debit',5,true,false),
    ('5240000','Sewa Alat & Mobilisasi','expense','debit',3,false,false),
      ('5240001','Sewa Alat Berat','expense','debit',5,true,false),
      ('5240002','Mobilisasi & Demobilisasi','expense','debit',5,true,false),
  ('5300000','Biaya Perizinan & Sertifikat','expense','debit',2,false,false),
    ('5300001','IMB / PBG','expense','debit',5,true,false),
    ('5300002','SHM / Pemecahan Sertifikat','expense','debit',5,true,false),
    ('5300003','BPHTB Pengalihan','expense','debit',5,true,false),
    ('5300004','Notaris & PPAT','expense','debit',5,true,false),
  ('5400000','Infrastruktur Kawasan','expense','debit',2,false,false),
    ('5400001','Jalan & Drainase','expense','debit',5,true,false),
    ('5400002','Listrik & Air Kawasan','expense','debit',5,true,false),
    ('5400003','Fasum & Fasos','expense','debit',5,true,false),

-- ============ 6XXXXXX BEBAN OPERASIONAL ============
('6000000','BEBAN OPERASIONAL','expense','debit',1,false,true),
  ('6100000','Beban Pemasaran & Promosi','expense','debit',2,false,false),
    ('6100001','Komisi Sales / Agen','expense','debit',5,true,false),
    ('6100002','Iklan & Marketing Digital','expense','debit',5,true,false),
    ('6100003','Brosur, Pameran, Event','expense','debit',5,true,false),
    ('6100004','Hadiah Promo / Souvenir Konsumen','expense','debit',5,true,false),
  ('6200000','Beban Administrasi & Umum','expense','debit',2,false,false),
    ('6210000','Beban Karyawan Kantor','expense','debit',3,false,false),
      ('6210001','Gaji & Tunjangan Karyawan','expense','debit',5,true,false),
      ('6210002','BPJS Kesehatan & Ketenagakerjaan','expense','debit',5,true,false),
      ('6210003','Tunjangan Hari Raya','expense','debit',5,true,false),
    ('6220000','Beban Kantor','expense','debit',3,false,false),
      ('6220001','Sewa Kantor','expense','debit',5,true,false),
      ('6220002','Listrik, Air, Internet, Telepon','expense','debit',5,true,false),
      ('6220003','ATK & Perlengkapan','expense','debit',5,true,false),
      ('6220004','Konsumsi & Rapat Kantor','expense','debit',5,true,false),
    ('6230000','Beban Operasional Kendaraan','expense','debit',3,false,false),
      ('6230001','BBM & Tol','expense','debit',5,true,false),
      ('6230002','Pemeliharaan Kendaraan','expense','debit',5,true,false),
      ('6230003','Pajak Kendaraan','expense','debit',5,true,false),
    ('6240000','Penyusutan & Amortisasi','expense','debit',3,false,false),
      ('6240001','Penyusutan Bangunan','expense','debit',5,true,false),
      ('6240002','Penyusutan Kendaraan','expense','debit',5,true,false),
      ('6240003','Penyusutan Peralatan & Inventaris','expense','debit',5,true,false),
    ('6250000','Beban Profesional','expense','debit',3,false,false),
      ('6250001','Honor Konsultan','expense','debit',5,true,false),
      ('6250002','Audit & Pajak','expense','debit',5,true,false),
  ('6300000','Beban Keuangan','expense','debit',2,false,false),
    ('6300001','Bunga Pinjaman Bank','expense','debit',5,true,false),
    ('6300002','Biaya Administrasi Bank','expense','debit',5,true,false),
    ('6300003','Provisi & Asuransi Pinjaman','expense','debit',5,true,false),

-- ============ 8XXXXXX PENDAPATAN LAIN-LAIN ============
('8000000','PENDAPATAN LAIN-LAIN','other_income','credit',1,false,true),
  ('8100000','Pendapatan Bunga & Investasi','other_income','credit',2,false,false),
    ('8100001','Bunga Jasa Giro','other_income','credit',5,true,false),
    ('8100002','Bunga Deposito','other_income','credit',5,true,false),
  ('8200000','Pendapatan Sewa','other_income','credit',2,false,false),
    ('8200001','Sewa Unit Belum Terjual','other_income','credit',5,true,false),
    ('8200002','Sewa Ruang Reklame / Tower','other_income','credit',5,true,false),
    ('8200003','Sewa Aset Lainnya','other_income','credit',5,true,false),
  ('8300000','Denda & Penalti Konsumen','other_income','credit',2,false,false),
    ('8300001','Denda Keterlambatan Cicilan','other_income','credit',5,true,false),
    ('8300002','Denda Pembatalan / Booking Hangus','other_income','credit',5,true,false),
  ('8400000','Keuntungan Penjualan Aset','other_income','credit',2,false,false),
    ('8400001','Keuntungan Penjualan Aset Tetap','other_income','credit',5,true,false),
  ('8500000','Selisih Kurs & Diskon','other_income','credit',2,false,false),
    ('8500001','Keuntungan Selisih Kurs','other_income','credit',5,true,false),
    ('8500002','Diskon & Potongan dari Supplier','other_income','credit',5,true,false),
  ('8600000','Pemulihan & Klaim','other_income','credit',2,false,false),
    ('8600001','Pemulihan Piutang Telah Dihapus','other_income','credit',5,true,false),
    ('8600002','Klaim Asuransi','other_income','credit',5,true,false),
  ('8900000','Pendapatan Lain-lain Tidak Terduga','other_income','credit',2,false,false),
    ('8900001','Pendapatan Lain-lain Lainnya','other_income','credit',5,true,false),

-- ============ 9XXXXXX BIAYA LAIN-LAIN ============
('9000000','BIAYA LAIN-LAIN','other_expense','debit',1,false,true),
  ('9100000','Kerugian Penjualan & Penurunan Aset','other_expense','debit',2,false,false),
    ('9100001','Kerugian Penjualan Aset Tetap','other_expense','debit',5,true,false),
    ('9100002','Kerugian Penurunan Nilai Persediaan','other_expense','debit',5,true,false),
  ('9200000','Selisih Kurs','other_expense','debit',2,false,false),
    ('9200001','Kerugian Selisih Kurs','other_expense','debit',5,true,false),
  ('9300000','Piutang Tak Tertagih','other_expense','debit',2,false,false),
    ('9300001','Beban Penghapusan Piutang (Write-off)','other_expense','debit',5,true,false),
  ('9400000','Denda & Sanksi','other_expense','debit',2,false,false),
    ('9400001','Denda Pajak','other_expense','debit',5,true,false),
    ('9400002','Denda Kontrak / Komplain Konsumen','other_expense','debit',5,true,false),
  ('9500000','Sumbangan & CSR','other_expense','debit',2,false,false),
    ('9500001','Sumbangan, CSR, Donasi','other_expense','debit',5,true,false),
  ('9600000','Force Majeure','other_expense','debit',2,false,false),
    ('9600001','Kerugian Bencana / Force Majeure','other_expense','debit',5,true,false),
  ('9900000','Biaya Lain-lain Tidak Terduga','other_expense','debit',2,false,false),
    ('9900001','Biaya Lain-lain Lainnya','other_expense','debit',5,true,false)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Resolve parent_id berdasarkan derivasi kode
--    Aturan:
--      Level 5: parent = first 4 char + '000' jika ada (kalau tidak, first 2 + '00000')
--      Level 4: parent = first 4 char + '000'  (sebenarnya XXXX000 = parent dari XXXXX00; kita pakai LEFT 4)
--      Level 3: parent = first 2 char + '00000'
--      Level 2: parent = first 1 char + '000000'
--      Level 1: parent = NULL
-- ------------------------------------------------------------

-- Level 2: parent = first 1 digit + '000000'
UPDATE chart_of_accounts c SET parent_id = p.id
  FROM chart_of_accounts p
 WHERE c.level = 2 AND c.parent_id IS NULL
   AND p.code = LEFT(c.code, 1) || '000000';

-- Level 3: parent = first 2 digit + '00000'
UPDATE chart_of_accounts c SET parent_id = p.id
  FROM chart_of_accounts p
 WHERE c.level = 3 AND c.parent_id IS NULL
   AND p.code = LEFT(c.code, 2) || '00000';

-- Level 4: parent = first 4 digit + '000'  → tapi jangan tunjuk diri sendiri
UPDATE chart_of_accounts c SET parent_id = p.id
  FROM chart_of_accounts p
 WHERE c.level = 4 AND c.parent_id IS NULL
   AND p.code = LEFT(c.code, 4) || '000';

-- Level 5: prefer parent level 4 (LEFT 4 + '000'), fallback ke parent level 3 (LEFT 2 + '00000')
-- Coba dulu match ke header level 4
UPDATE chart_of_accounts c SET parent_id = p.id
  FROM chart_of_accounts p
 WHERE c.level = 5 AND c.parent_id IS NULL
   AND p.code = LEFT(c.code, 4) || '000'
   AND p.level = 4;

-- Sisa level 5 yang belum ada parent → match ke header level 3
UPDATE chart_of_accounts c SET parent_id = p.id
  FROM chart_of_accounts p
 WHERE c.level = 5 AND c.parent_id IS NULL
   AND p.code = LEFT(c.code, 4) || '000'
   AND p.level = 3;

-- Sisa lagi (mis. tidak ada level 3 yang cocok) → match ke level 2
UPDATE chart_of_accounts c SET parent_id = p.id
  FROM chart_of_accounts p
 WHERE c.level = 5 AND c.parent_id IS NULL
   AND p.code = LEFT(c.code, 2) || '00000'
   AND p.level = 2;

-- =====================================================================
-- Selesai. Total ~181 akun dengan hierarki parent_id ter-resolve.
-- Verifikasi:
--   SELECT COUNT(*), level FROM chart_of_accounts GROUP BY level ORDER BY level;
--   SELECT * FROM chart_of_accounts WHERE parent_id IS NULL AND level > 1; -- harus 0 baris
-- =====================================================================
