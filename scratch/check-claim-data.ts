
import { db } from "../server/db";
import { principalClaim } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkData() {
  try {
    console.log("Checking principal_claim table...");
    
    // Check Columns
    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'principal_claim';
    `);
    console.log("Columns:", JSON.stringify(cols.rows, null, 2));

    const allData = await db.select().from(principalClaim);
    console.log("Total rows:", allData.length);
    if (allData.length > 0) {
      console.log("Sample row (First 1):", JSON.stringify(allData[0], null, 2));
    }
  } catch (err) {
    console.error("Error checking data:", err);
  } finally {
    process.exit(0);
  }
}

checkData();
