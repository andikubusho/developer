import { db, pool } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    console.log("Menjalankan migrasi database manual untuk menambahkan can_view...");
    await db.execute(sql`
      ALTER TABLE user_permissions 
      ADD COLUMN IF NOT EXISTS can_view boolean DEFAULT true;
    `);
    console.log("Migrasi berhasil!");
  } catch (error) {
    console.error("Migrasi gagal:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
