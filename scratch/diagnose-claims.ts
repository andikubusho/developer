import "dotenv/config";
import { db } from "../server/db";
import { principalClaim } from "../shared/schema";
import { count, sql } from "drizzle-orm";

async function diagnose() {
  console.log("--- Database Diagnosis: principal_claim ---");
  
  try {
    const totalCountRes = await db.select({ value: count() }).from(principalClaim);
    console.log("Total records in principal_claim:", totalCountRes[0].value);

    const stats = await db.select({
      branchId: principalClaim.branchId,
      status: principalClaim.status,
      count: count()
    })
    .from(principalClaim)
    .groupBy(principalClaim.branchId, principalClaim.status);
    
    console.log("Statistics (branchId, status, count):");
    console.table(stats);

    const samples = await db.select().from(principalClaim).limit(5);
    console.log("Sample records:");
    console.log(JSON.stringify(samples, null, 2));

  } catch (err) {
    console.error("Diagnosis failed:", err);
  }
}

diagnose();
