// @ts-nocheck
import { db, pool } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    console.log("Menjalankan migrasi point_hadiah untuk menambahkan brand_code...");
    
    // Add brand_code column if not exists
    await db.execute(sql`
      ALTER TABLE point_hadiah 
      ADD COLUMN IF NOT EXISTS brand_code text NOT NULL DEFAULT 'SEMUA';
    `);
    
    console.log("Migrasi brand_code berhasil!");
  } catch (error) {
    console.error("Migrasi gagal:", error);
  } finally {
    // Explicitly don't end pool if we are using it elsewhere, 
    // but here it's a standalone script
    if (pool) await pool.end();
    process.exit(0);
  }
}

migrate();
