import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting Principal System Migration...");

  try {
    // 1. principal_master
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS principal_master (
        id SERIAL PRIMARY KEY,
        nama TEXT NOT NULL,
        merek TEXT,
        pic_name TEXT,
        pic_phone TEXT,
        pic_email TEXT,
        branch_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("- principal_master created");

    // 2. principal_program
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS principal_program (
        id SERIAL PRIMARY KEY,
        nama TEXT NOT NULL,
        principal_id INTEGER NOT NULL REFERENCES principal_master(id),
        brand_code TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL DEFAULT NOW(),
        periode_bulan INTEGER,
        basis_type TEXT NOT NULL,
        acuan_tanggal TEXT NOT NULL DEFAULT 'faktur',
        status TEXT NOT NULL DEFAULT 'aktif',
        tanggal_nonaktif TIMESTAMP,
        branch_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("- principal_program created");

    // 3. principal_tier
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS principal_tier (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES principal_program(id) ON DELETE CASCADE,
        urutan_tier INTEGER NOT NULL,
        min_value NUMERIC NOT NULL,
        max_value NUMERIC,
        reward_perusahaan_type TEXT NOT NULL,
        reward_perusahaan_value NUMERIC,
        reward_perusahaan_desc TEXT,
        reward_principal_type TEXT NOT NULL,
        reward_principal_value NUMERIC,
        reward_principal_desc TEXT,
        reward_principal_detail TEXT,
        branch_id INTEGER NOT NULL
      )
    `);
    console.log("- principal_tier created");

    // 4. principal_subscription
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS principal_subscription (
        id SERIAL PRIMARY KEY,
        pelanggan_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        total_qty NUMERIC NOT NULL DEFAULT '0',
        total_nilai NUMERIC NOT NULL DEFAULT '0',
        current_tier_id INTEGER,
        total_reward_calculated NUMERIC NOT NULL DEFAULT '0',
        total_reward_claimed NUMERIC NOT NULL DEFAULT '0',
        last_claim_date TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'berjalan',
        periode_start TIMESTAMP NOT NULL,
        periode_end TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        branch_id INTEGER NOT NULL
      )
    `);
    
    // Add columns if they don't exist (for existing tables)
    try {
      await db.execute(sql`ALTER TABLE principal_subscription ADD COLUMN IF NOT EXISTS total_reward_calculated NUMERIC NOT NULL DEFAULT '0'`);
      await db.execute(sql`ALTER TABLE principal_subscription ADD COLUMN IF NOT EXISTS total_reward_claimed NUMERIC NOT NULL DEFAULT '0'`);
      await db.execute(sql`ALTER TABLE principal_subscription ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP`);
    } catch (e) {
      console.log("Columns might already exist or table doesn't exist yet.");
    }
    console.log("- principal_subscription updated");

    // 5. principal_claim
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS principal_claim (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER NOT NULL REFERENCES principal_subscription(id),
        program_id INTEGER NOT NULL REFERENCES principal_program(id),
        tier_id INTEGER NOT NULL REFERENCES principal_tier(id),
        pelanggan_id INTEGER NOT NULL,
        principal_id INTEGER NOT NULL REFERENCES principal_master(id),
        reward_principal_type TEXT NOT NULL,
        reward_principal_desc TEXT,
        reward_principal_value NUMERIC,
        status TEXT NOT NULL DEFAULT 'belum_klaim',
        catatan_ditolak TEXT,
        tanggal_klaim TIMESTAMP,
        tanggal_approval TIMESTAMP,
        branch_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Add columns if they don't exist (for existing tables)
    try {
      await db.execute(sql`ALTER TABLE principal_claim ADD COLUMN IF NOT EXISTS program_id INTEGER REFERENCES principal_program(id)`);
    } catch (e) {
      console.log("Column might already exist or table doesn't exist yet.");
    }
    console.log("- principal_claim updated");

    console.log("Migration finished successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
