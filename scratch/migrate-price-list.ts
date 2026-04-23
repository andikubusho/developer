
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    console.log("Dropping old price_list_items table...");
    await db.execute(sql`DROP TABLE IF EXISTS price_list_items`);

    console.log("Creating new price_list_items table...");
    await db.execute(sql`
      CREATE TABLE price_list_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        unit_id TEXT NOT NULL,
        category TEXT NOT NULL,
        cluster TEXT,
        blok TEXT NOT NULL,
        unit TEXT NOT NULL,
        tipe TEXT NOT NULL,
        luas_tanah NUMERIC NOT NULL,
        luas_bangunan NUMERIC NOT NULL,
        harga_jual NUMERIC NOT NULL,
        booking_fee NUMERIC NOT NULL DEFAULT 15000000,
        dp_percentage NUMERIC NOT NULL DEFAULT 0.10,
        status TEXT NOT NULL DEFAULT 'available',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Updating Golden Canyon project settings...");
    await db.execute(sql`
      UPDATE projects 
      SET settings = '{"bunga_flat": 0.0493, "dp_percentage": 0.10, "booking_fee": 15000000}'::jsonb
      WHERE id = '28680951-0ab9-4722-a58c-6436a9401e42'
    `);

    console.log("✅ Migration complete.");
  } catch (error) {
    console.error("❌ Error during migration:", error);
  }
  process.exit(0);
}

migrate();
