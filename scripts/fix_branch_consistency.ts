
import { db } from "../server/db.js";
import { 
  transaksiPromo, 
  promoHasil, 
  pointLogs, 
  labelQuotas, 
  paketProgress, 
  cuttingProgress,
  promoBrands
} from "../shared/schema.js";
import { eq, and, sql, inArray } from "drizzle-orm";

async function runMigration() {
  console.log("[Migration] Starting branch consistency fix...");

  const targetBranchId = 2; // PJM
  const wrongBranchId = 3;  // Ferio Motor
  const brandCode = 'KENDA';

  const misalignedTxs = await db.select()
    .from(transaksiPromo)
    .where(and(
      eq(sql`LOWER(${transaksiPromo.brandCode})`, brandCode.toLowerCase()),
      eq(transaksiPromo.branchId, wrongBranchId)
    ));

  console.log(`[Migration] Found ${misalignedTxs.length} misaligned KENDA transactions in Branch ${wrongBranchId}.`);

  if (misalignedTxs.length === 0) {
     console.log("[Migration] No misaligned transactions found. Skipping.");
     return;
  }

  const txIds = misalignedTxs.map(t => t.id);
  const invoices = misalignedTxs.map(t => t.noFaktur.trim());
  const pelangganIds = Array.from(new Set(misalignedTxs.map(t => t.pelangganId)));

  await db.transaction(async (tx) => {
    // 1. Update transaksi_promo_new
    console.log(`[Migration] Updating ${txIds.length} transactions in transaksi_promo_new...`);
    await tx.update(transaksiPromo)
      .set({ branchId: targetBranchId })
      .where(inArray(transaksiPromo.id, txIds));

    // 2. promo_hasil tidak punya branchId, jadi skip update kolom tersebut.
    // Namun ia terhubung via transaksiId, sehingga pencarian di UI (yang JOIN ke transaksi) 
    // akan otomatis mengikuti cabang transaksi yang baru.

    // 3. Update point_logs
    console.log("[Migration] Updating point_logs...");
    await tx.update(pointLogs)
      .set({ branchId: targetBranchId })
      .where(and(
        inArray(sql`TRIM(${pointLogs.invoiceNumber})`, invoices),
        eq(pointLogs.branchId, wrongBranchId)
      ));

    // 4. Update label_quotas
    console.log("[Migration] Updating label_quotas...");
    await tx.update(labelQuotas)
      .set({ branchId: targetBranchId })
      .where(and(
        inArray(sql`TRIM(${labelQuotas.invoiceNumber})`, invoices),
        eq(labelQuotas.branchId, wrongBranchId)
      ));

    // 5. Update progress records
    console.log("[Migration] Updating progress records (Paket & Cutting)...");
    for (const pid of pelangganIds) {
       await tx.update(paketProgress)
         .set({ branchId: targetBranchId })
         .where(and(
           eq(paketProgress.pelangganId, pid),
           eq(paketProgress.branchId, wrongBranchId)
         ));
       
       await tx.update(cuttingProgress)
         .set({ branchId: targetBranchId })
         .where(and(
           eq(cuttingProgress.pelangganId, pid),
           eq(cuttingProgress.branchId, wrongBranchId)
         ));
    }
  });

  console.log("[Migration] Branch consistency fix successful.");
}

runMigration().catch(console.error).finally(() => process.exit(0));
