import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function forceMigration() {
  console.log("🚀 FORCING SYNC OF PROMO TABLES TO SUPABASE...");
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS cashback_master (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      tipe_cashback TEXT NOT NULL,
      nilai NUMERIC NOT NULL,
      min_transaksi NUMERIC NOT NULL DEFAULT '0',
      maks_cashback NUMERIC,
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS point_master (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      poin_per_qty NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS cutting_master (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      nilai_per_label NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS paket_master (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      brand_code TEXT,
      periode_bulan INTEGER NOT NULL,
      start_date TIMESTAMP NOT NULL,
      basis_type TEXT NOT NULL,
      acuan_tanggal TEXT NOT NULL DEFAULT 'faktur',
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `ALTER TABLE paket_master ADD COLUMN IF NOT EXISTS brand_code TEXT`,
    `CREATE TABLE IF NOT EXISTS paket_tier (
      id SERIAL PRIMARY KEY,
      paket_id INTEGER NOT NULL,
      urutan_tier INTEGER NOT NULL,
      min_value NUMERIC NOT NULL,
      max_value NUMERIC,
      reward_type TEXT NOT NULL,
      reward_value NUMERIC,
      reward_percent NUMERIC,
      reward_desc TEXT
    )`,
    `ALTER TABLE paket_tier ADD COLUMN IF NOT EXISTS reward_percent NUMERIC`,
    `CREATE TABLE IF NOT EXISTS hadiah_katalog (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      poin_dibutuhkan NUMERIC NOT NULL,
      stok INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS paket_pelanggan (
      id SERIAL PRIMARY KEY,
      pelanggan_id INTEGER NOT NULL,
      paket_id INTEGER NOT NULL,
      tgl_mulai TIMESTAMP NOT NULL,
      tgl_selesai TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS promo_pelanggan (
      id SERIAL PRIMARY KEY,
      pelanggan_id INTEGER NOT NULL,
      promo_id INTEGER NOT NULL,
      promo_type TEXT NOT NULL,
      tgl_mulai TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS paket_progress (
      id SERIAL PRIMARY KEY,
      pelanggan_id INTEGER NOT NULL,
      paket_id INTEGER NOT NULL,
      total_qty NUMERIC DEFAULT '0',
      total_nilai NUMERIC DEFAULT '0',
      current_tier_id INTEGER,
      status TEXT NOT NULL DEFAULT 'berjalan',
      periode_start TIMESTAMP NOT NULL,
      periode_end TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS cutting_progress (
      id SERIAL PRIMARY KEY,
      pelanggan_id INTEGER NOT NULL,
      master_label_id INTEGER NOT NULL,
      total_label NUMERIC DEFAULT '0',
      total_nilai NUMERIC DEFAULT '0',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS point_saldo (
      pelanggan_id INTEGER PRIMARY KEY,
      total_diperoleh NUMERIC DEFAULT '0',
      total_ditukar NUMERIC DEFAULT '0',
      saldo_poin NUMERIC DEFAULT '0',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS point_history (
      id SERIAL PRIMARY KEY,
      pelanggan_id INTEGER NOT NULL,
      poin NUMERIC NOT NULL,
      tipe TEXT NOT NULL,
      referensi_id INTEGER,
      keterangan TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS reward_claim (
      id SERIAL PRIMARY KEY,
      pelanggan_id INTEGER NOT NULL,
      jenis_promo TEXT NOT NULL,
      hadiah_id INTEGER,
      tier_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      poin_digunakan NUMERIC,
      approved_by INTEGER,
      claimed_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS transaksi_promo_new (
      id SERIAL PRIMARY KEY,
      faktur_monitor_id INTEGER NOT NULL,
      pelanggan_id INTEGER NOT NULL,
      tgl_transaksi TIMESTAMP NOT NULL,
      cashback_earned NUMERIC DEFAULT '0',
      point_earned NUMERIC DEFAULT '0',
      label_earned NUMERIC DEFAULT '0',
      paket_contrib_qty NUMERIC DEFAULT '0',
      paket_contrib_nilai NUMERIC DEFAULT '0',
      is_processed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`
  ];

  for (const query of tables) {
    try {
      await db.execute(sql.raw(query));
      console.log("✅ Table setup step complete.");
    } catch (err: any) {
      console.error("❌ ERROR DETAIL:", err.message);
    }
  }

  console.log("\n✨ DATABASE PROMO READY!");
}

forceMigration().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
