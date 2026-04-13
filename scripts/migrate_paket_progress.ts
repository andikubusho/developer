import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("[MIGRATION] Adding anti-double-claim columns to paket_progress...");
  
  try {
    await db.execute(sql`
      ALTER TABLE paket_progress 
      ADD COLUMN IF NOT EXISTS total_reward_calculated NUMERIC NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS total_reward_claimed NUMERIC NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP
    `);
    console.log("[MIGRATION] ✅ Columns added successfully.");
  } catch (err: any) {
    if (err.message?.includes("already exists")) {
      console.log("[MIGRATION] Columns already exist, skipping.");
    } else {
      console.error("[MIGRATION] ❌ Error:", err.message);
      throw err;
    }
  }
  
  console.log("[MIGRATION] Done.");
  process.exit(0);
}

migrate();
