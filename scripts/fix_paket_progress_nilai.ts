import { db } from "../server/db";
import { paketProgress, transaksiPromo, paketMaster, pelangganProgram } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function fixPaketProgressNilai() {
  console.log("[FIX] Fixing paket_progress totalNilai for basisType=qty records...");
  
  // Get all paket_progress records
  const allProgress = await db.select().from(paketProgress);
  console.log(`[FIX] Found ${allProgress.length} paket_progress records`);
  
  for (const prog of allProgress) {
    // Get paket master to check basisType
    const [master] = await db.select().from(paketMaster).where(eq(paketMaster.id, prog.paketId)).limit(1);
    if (!master) continue;
    
    // Get all transactions for this customer + branch
    const mappings = await db.select().from(pelangganProgram).where(and(
      eq(pelangganProgram.pelangganId, prog.pelangganId),
      eq(pelangganProgram.branchId, prog.branchId),
      eq(pelangganProgram.jenisProgram, 'paket'),
      eq(pelangganProgram.referensiId, master.id)
    ));
    
    if (mappings.length === 0) continue;
    
    const brandCode = mappings[0].brandCode || 'FERIO';
    const transactions = await db.select().from(transaksiPromo).where(and(
      eq(transaksiPromo.pelangganId, prog.pelangganId),
      eq(transaksiPromo.branchId, prog.branchId),
      eq(transaksiPromo.brandCode, brandCode)
    ));
    
    // Accumulate BOTH qty and nilai
    let totalQty = 0;
    let totalNilai = 0;
    for (const t of transactions) {
      totalQty += t.qty;
      totalNilai += Number(t.nilaiFaktur);
    }
    
    console.log(`[FIX] Customer ${prog.pelangganId}, Paket ${master.nama}: qty=${totalQty}, nilai=${totalNilai} (was: qty=${prog.totalQty}, nilai=${prog.totalNilai})`);
    
    if (Number(prog.totalNilai) !== totalNilai || Number(prog.totalQty) !== totalQty) {
      await db.update(paketProgress).set({
        totalQty: totalQty.toString(),
        totalNilai: totalNilai.toString(),
        updatedAt: new Date()
      }).where(eq(paketProgress.id, prog.id));
      console.log(`[FIX] ✅ Updated!`);
    } else {
      console.log(`[FIX] Already correct, skipping.`);
    }
  }
  
  console.log("[FIX] Done.");
  process.exit(0);
}

fixPaketProgressNilai();
