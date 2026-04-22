
import { db } from "../server/db.js";
import { transaksiPromo, salesCustomers, promoHasil, pointLogs, labelQuotas, paketProgress, paketMaster, paketTier } from "../shared/schema.js";
import { eq, and, sql, desc, or } from "drizzle-orm";

async function debug() {
  console.log("[Debug] Initializing API response simulation for PJM (Branch 2)...");

  // Mocking getEffectiveBranch logic
  const effectiveBranchId = 2; // PJM

  console.log(`[Debug] effectiveBranchId: ${effectiveBranchId}`);

  // 1. Raw Query (Mirroring server/routes.ts:2170)
  const rawData = await db
    .select({
      id: transaksiPromo.id,
      pelangganId: transaksiPromo.pelangganId,
      brandCode: transaksiPromo.brandCode,
      noFaktur: transaksiPromo.noFaktur,
      branchId: transaksiPromo.branchId,
      pelangganName: salesCustomers.name,
    })
    .from(transaksiPromo)
    .leftJoin(salesCustomers, eq(transaksiPromo.pelangganId, salesCustomers.id))
    .where(eq(transaksiPromo.branchId, effectiveBranchId))
    .orderBy(desc(transaksiPromo.createdAt));

  console.log(`[Debug] Raw Data Count: ${rawData.length}`);
  console.table(rawData.slice(0, 5));

  if (rawData.length === 0) {
     console.log("[Debug] ERROR: No raw transactions found for Branch 2 even though we migrated them.");
     return;
  }

  // 2. Enrichment Simulation (Mirroring server/routes.ts:2194)
  console.log("[Debug] Starting Enrichment Simulation...");
  try {
    const enrichedData = await Promise.all(rawData.map(async (t) => {
        // Mocking simplified rewards fetch to isolate error
        const cashbackRows = await db.select().from(promoHasil).where(eq(promoHasil.transaksiId, t.id));
        const pointRows = await db.select().from(pointLogs).where(sql`TRIM(${pointLogs.invoiceNumber}) ILIKE ${t.noFaktur.trim()}`);
        const labelRows = await db.select().from(labelQuotas).where(sql`TRIM(${labelQuotas.invoiceNumber}) ILIKE ${t.noFaktur.trim()}`);
        
        return {
           id: t.id,
           noFaktur: t.noFaktur,
           cb: cashbackRows.length,
           pts: pointRows.length,
           lbl: labelRows.length
        };
    }));
    
    console.log("[Debug] Enrichment Success!");
    console.table(enrichedData.slice(0, 5));
  } catch (err: any) {
    console.error("[Debug] Enrichment Failed with exception:", err);
  }
}

debug().catch(console.error).finally(() => process.exit(0));
