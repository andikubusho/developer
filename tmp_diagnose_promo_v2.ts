
import { db } from "./server/db.js";
import { transaksiPromo, promoBrands } from "./shared/schema.js";
import { sql } from "drizzle-orm";

async function diagnose() {
  const brandStats = await db.select({
    branchId: promoBrands.branchId,
    brandName: promoBrands.name,
  }).from(promoBrands);
  console.log("Master Brands Distribution:");
  console.table(brandStats);

  const txStats = await db.select({
    branchId: transaksiPromo.branchId,
    brandCode: transaksiPromo.brandCode,
    count: sql`count(*)`,
  }).from(transaksiPromo)
  .groupBy(transaksiPromo.branchId, transaksiPromo.brandCode);
  console.log("Transaction Distribution by Brand & Branch:");
  console.table(txStats);
}

diagnose().catch(console.error).finally(() => process.exit(0));
