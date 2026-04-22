
import { db } from "./server/db";
import { promoInputs, branches } from "./shared/schema";
import { sql } from "drizzle-orm";

async function checkOldData() {
  console.log("=== OLD DATA CHECK ===");
  const stats = await db.select({
    branchId: promoInputs.branchId,
    count: sql<number>`count(*)`
  }).from(promoInputs).groupBy(promoInputs.branchId);
  console.log("Old Promo Inputs (Cashback) per Branch:", stats);
  process.exit(0);
}

checkOldData().catch(err => {
  console.error(err);
  process.exit(1);
});
