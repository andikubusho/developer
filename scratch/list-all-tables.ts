
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function listTables() {
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in public schema:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error listing tables:", error);
  }
  process.exit(0);
}

listTables();
