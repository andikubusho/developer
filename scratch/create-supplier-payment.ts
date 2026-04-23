
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function createTable() {
  try {
    console.log("Creating table supplier_payment...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS supplier_payment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id UUID,
        spk_id UUID,
        supplier_name TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("✅ Table supplier_payment created successfully.");
  } catch (error) {
    console.error("❌ Error creating table:", error);
  }
  process.exit(0);
}

createTable();
