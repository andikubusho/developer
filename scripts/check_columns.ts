
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function check() {
  const res = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'paket_tier'
  `);
  console.log("COLUMNS IN paket_tier:", res.rows);
  process.exit(0);
}

check();
