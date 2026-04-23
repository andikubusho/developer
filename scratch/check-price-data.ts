
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkData() {
  try {
    const result = await db.execute(sql`
      SELECT * FROM price_list_items LIMIT 5
    `);
    console.log("Price List Items Data:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error checking data:", error);
  }
  process.exit(0);
}

checkData();
