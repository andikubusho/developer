import { db } from "./db.js";
import { transaksiPromo, promoHasil, pointLogs, labelQuotas } from "../shared/schema.js";
import { sql, isNull, eq } from "drizzle-orm";

async function diagnose() {
  console.log("=== DIAGNOSA DATA PROMO (ROOT) ===");
  
  // 1. Check transaksi_promo_new
  const txStats = await db.select({ 
    branchId: transaksiPromo.branchId, 
    count: sql<number>`count(*)` 
  }).from(transaksiPromo).groupBy(transaksiPromo.branchId);
  console.log("Riwayat Transaksi (transaksi_promo_new):", JSON.stringify(txStats, null, 2));

  // 2. Check NULLs specifically
  const nullTx = await db.select({ count: sql<number>`count(*)` })
    .from(transaksiPromo).where(isNull(transaksiPromo.branchId));
  console.log("Transaksi dengan branchId NULL:", nullTx[0].count);

  // 3. Check Related Tables NULLs
  const nullHasil = await db.select({ count: sql<number>`count(*)` }).from(promoHasil).where(isNull(promoHasil.branchId));
  const nullPoints = await db.select({ count: sql<number>`count(*)` }).from(pointLogs).where(isNull(pointLogs.branchId));
  const nullLabels = await db.select({ count: sql<number>`count(*)` }).from(labelQuotas).where(isNull(labelQuotas.branchId));
  
  console.log("Hasil Cashback NULL branchId:", nullHasil[0].count);
  console.log("Point Logs NULL branchId:", nullPoints[0].count);
  console.log("Label Quotas NULL branchId:", nullLabels[0].count);

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
