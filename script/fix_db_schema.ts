
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fix() {
  console.log("Fixing DB Schema...");
  try {
    await db.execute(sql`
      ALTER TABLE principal_subscription 
      ADD COLUMN IF NOT EXISTS periode_siklus text;
    `);
    console.log("- Added periode_siklus");
    
    await db.execute(sql`
      ALTER TABLE principal_subscription 
      ADD COLUMN IF NOT EXISTS status_periode text;
    `);
    console.log("- Added status_periode");
    
    await db.execute(sql`
      ALTER TABLE principal_subscription 
      ADD COLUMN IF NOT EXISTS persen_tercapai numeric DEFAULT '0';
    `);
    console.log("- Added persen_tercapai");
    
    console.log("\nSuccess! DB Schema fixed.");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
  process.exit(0);
}

fix();
