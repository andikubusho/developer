
import { db } from "./server/db";
import { transaksiPromo, paketProgress, cuttingProgress, pointSaldo, promoHasil, branches } from "./shared/schema";
import { sql, eq } from "drizzle-orm";

async function checkData() {
  console.log("=== DATA CHECK ===");
  
  const branchList = await db.select().from(branches);
  console.log("Branches in system:", branchList.map(b => `${b.id}: ${b.name}`).join(" | "));

  const txStats = await db.select({
    branchId: transaksiPromo.branchId,
    count: sql<number>`count(*)`
  }).from(transaksiPromo).groupBy(transaksiPromo.branchId);
  console.log("Transaksi Promo per Branch:", txStats);

  const paketStats = await db.select({
    branchId: paketProgress.branchId,
    count: sql<number>`count(*)`
  }).from(paketProgress).groupBy(paketProgress.branchId);
  console.log("Paket Progress per Branch:", paketStats);

  const cashbackStats = await db.select({
    branchId: transaksiPromo.branchId,
    count: sql<number>`count(*)`
  }).from(promoHasil)
    .innerJoin(transaksiPromo, eq(promoHasil.transaksiId, transaksiPromo.id))
    .groupBy(transaksiPromo.branchId);
  console.log("Cashback Results per Branch:", cashbackStats);

  process.exit(0);
}

checkData().catch(err => {
  console.error("ERROR CHECKING DATA:", err);
  process.exit(1);
});
