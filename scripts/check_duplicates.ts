
import { db } from "../server/db";
import { salesCustomers } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkDuplicates() {
  console.log("Checking for duplicates in sales_customers (by code)...");
  
  const duplicates = await db.select({
    code: salesCustomers.code,
    count: sql<number>`count(*)`,
    names: sql<string>`string_agg(${salesCustomers.name}, ', ')`
  })
  .from(salesCustomers)
  .groupBy(salesCustomers.code)
  .having(sql`count(*) > 1`);

  if (duplicates.length === 0) {
    console.log("No duplicate codes found.");
    return;
  }

  console.log(`Found ${duplicates.length} duplicate codes:`);
  for (const d of duplicates) {
    console.log(`- Code: ${d.code} | Count: ${d.count} | Names: ${d.names}`);
  }
}

checkDuplicates().catch(console.error).finally(() => process.exit());
