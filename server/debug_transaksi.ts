
import { db } from "./db";
import { transaksiPromo, promoHasil, salesCustomers } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function debugData() {
  const branchId = 2; // PJM
  
  console.log(`--- DEBUG DATA BRANCH ${branchId} ---`);
  
  const transCount = await db.select({ count: sql<number>`count(*)` }).from(transaksiPromo).where(eq(transaksiPromo.branchId, branchId));
  console.log(`Total Transaksi (New): ${transCount[0].count}`);
  
  const hasilCount = await db.select({ count: sql<number>`count(*)` }).from(promoHasil);
  // Note: promoHasil doesn't have branchId, must join with transaksiPromo
  const hasilWithBranch = await db.select({ count: sql<number>`count(*)` })
    .from(promoHasil)
    .innerJoin(transaksiPromo, eq(promoHasil.transaksiId, transaksiPromo.id))
    .where(eq(transaksiPromo.branchId, branchId));
  console.log(`Total Promo Hasil (New): ${hasilWithBranch[0].count}`);

  const sampleTrans = await db.select().from(transaksiPromo).where(eq(transaksiPromo.branchId, branchId)).limit(5);
  console.log("Sample Transaksi:", JSON.stringify(sampleTrans, null, 2));

  process.exit(0);
}

debugData().catch(err => {
  console.error(err);
  process.exit(1);
});
