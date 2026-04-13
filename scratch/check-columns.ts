import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkColumns() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_permissions'
    `);
    console.log("Columns in user_permissions:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error checking columns:", error);
  }
  process.exit(0);
}

checkColumns();
