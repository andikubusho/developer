
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkColumns() {
  const tables = ['project_opnames', 'kpr_disbursement', 'spks'];
  try {
    for (const table of tables) {
      const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
      `);
      console.log(`\nColumns in ${table}:`);
      console.table(result.rows);
    }
  } catch (error) {
    console.error("Error checking columns:", error);
  }
  process.exit(0);
}

checkColumns();
