import { db } from "../server/db";
import { 
  transaksiPromo, paketProgress, cuttingProgress, pointSaldo, 
  paketMaster, cuttingMaster, pointMaster, pelangganProgram, paketTier
} from "../shared/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

async function syncStrict() {
  console.log("=== STARTING STRICT SYNC (Absolut Isolation) ===");

  try {
    // 1. Reset Progress Tables
    console.log("Cleaning old progress records...");
    await db.delete(paketProgress);
    await db.delete(cuttingProgress);
    await db.delete(pointSaldo);
    console.log("Progress tables cleaned.");

    // 2. Fetch all transactions, sorted by date
    const allTransactions = await db.select().from(transaksiPromo).orderBy(transaksiPromo.tglFaktur);
    console.log(`Found ${allTransactions.length} transactions to process.`);

    for (const t of allTransactions) {
      const { pelangganId, brandCode, qty, nilaiFaktur, tglFaktur, noFaktur } = t;
      const branchId = t.branchId as number;
      const brand = (brandCode || 'FERIO').toUpperCase();
      
      console.log(`Processing ${noFaktur} - ${brand} (Branch: ${branchId})`);

      // A. Points
      const pmArr = await db.select().from(pointMaster).where(and(
        eq(pointMaster.brandCode, brand),
        eq(pointMaster.status, 'aktif')
      )).limit(1);
      
      if (pmArr.length > 0) {
        const pm = pmArr[0];
        const pointVal = qty * Number(pm.poinPerQty);
        
        const existingS = await db.select().from(pointSaldo).where(and(
          eq(pointSaldo.pelangganId, pelangganId),
          eq(pointSaldo.brandCode, brand),
          eq(pointSaldo.branchId, branchId)
        )).limit(1);

        if (existingS.length > 0) {
          await db.update(pointSaldo).set({
            saldoPoin: (Number(existingS[0].saldoPoin) + pointVal).toString(),
            totalDiperoleh: (Number(existingS[0].totalDiperoleh) + pointVal).toString(),
            updatedAt: new Date()
          }).where(eq(pointSaldo.id, existingS[0].id));
        } else {
          await db.insert(pointSaldo).values({
            pelangganId,
            brandCode: brand,
            saldoPoin: pointVal.toString(),
            totalDiperoleh: pointVal.toString(),
            branchId,
            updatedAt: new Date()
          });
        }
      }

      // B. Cutting Label
      const cmArr = await db.select().from(cuttingMaster).where(and(
        eq(cuttingMaster.brandCode, brand),
        eq(cuttingMaster.status, 'aktif')
      )).limit(1);

      for (const cm of cmArr) {
        const totalN = qty * Number(cm.nilaiPerLabel);
        const existingC = await db.select().from(cuttingProgress).where(and(
          eq(cuttingProgress.pelangganId, pelangganId),
          eq(cuttingProgress.cuttingId, cm.id),
          eq(cuttingProgress.branchId, branchId)
        )).limit(1);

        if (existingC.length > 0) {
          await db.update(cuttingProgress).set({
            totalLabel: existingC[0].totalLabel + qty,
            totalNilai: (Number(existingC[0].totalNilai) + totalN).toString(),
            updatedAt: new Date()
          }).where(eq(cuttingProgress.id, existingC[0].id));
        } else {
          await db.insert(cuttingProgress).values({
            pelangganId,
            cuttingId: cm.id,
            totalLabel: qty,
            totalNilai: totalN.toString(),
            branchId,
            statusCair: 'belum',
            updatedAt: new Date()
          });
        }
      }

      // C. Paket Progress
      // Only process brands that have an active registration for this customer
      const pProgs = await db.select().from(pelangganProgram).where(and(
        eq(pelangganProgram.pelangganId, pelangganId),
        eq(pelangganProgram.brandCode, brand),
        eq(pelangganProgram.status, 'aktif'),
        eq(pelangganProgram.branchId, branchId)
      ));

      for (const pp of pProgs) {
        if (pp.jenisProgram !== 'paket') continue;
        const masters = await db.select().from(paketMaster).where(eq(paketMaster.id, pp.referensiId)).limit(1);
        if (masters.length === 0) continue;
        const m = masters[0];
        
        // Date check
        const pEnd = new Date(new Date(m.startDate).setMonth(new Date(m.startDate).getMonth() + m.periodeBulan));
        const currentT = m.acuanTanggal === 'faktur' ? new Date(tglFaktur) : new Date();
        if (currentT < m.startDate || currentT > pEnd) continue;

        const existingP = await db.select().from(paketProgress).where(and(
          eq(paketProgress.pelangganId, pelangganId),
          eq(paketProgress.paketId, m.id),
          eq(paketProgress.branchId, branchId)
        )).limit(1);

        const deltaQty = m.basisType === 'qty' ? qty : 0;
        const deltaNilai = m.basisType === 'nilai' ? Number(nilaiFaktur) : 0;

        if (existingP.length > 0) {
          const p = existingP[0];
          const nQ = Number(p.totalQty) + deltaQty;
          const nV = Number(p.totalNilai) + deltaNilai;
          
          // Recalculate Tier
          const tiers = await db.select().from(paketTier).where(eq(paketTier.paketId, m.id)).orderBy(desc(paketTier.urutanTier));
          let tierId = null;
          const val = m.basisType === 'qty' ? nQ : nV;
          for (const tr of tiers) {
             if (val >= Number(tr.minValue)) { tierId = tr.id; break; }
          }

          await db.update(paketProgress).set({
            totalQty: nQ.toString(),
            totalNilai: nV.toString(),
            currentTierId: tierId,
            status: tierId ? 'tercapai' : 'berjalan',
            updatedAt: new Date()
          }).where(eq(paketProgress.id, p.id));
        } else {
          // Initialize
          const nQ = deltaQty;
          const nV = deltaNilai;
          const tiers = await db.select().from(paketTier).where(eq(paketTier.paketId, m.id)).orderBy(desc(paketTier.urutanTier));
          let tierId = null;
          const val = m.basisType === 'qty' ? nQ : nV;
          for (const tr of tiers) {
             if (val >= Number(tr.minValue)) { tierId = tr.id; break; }
          }

          await db.insert(paketProgress).values({
            pelangganId,
            paketId: m.id,
            totalQty: nQ.toString(),
            totalNilai: nV.toString(),
            periodeStart: m.startDate,
            periodeEnd: pEnd,
            currentTierId: tierId,
            status: tierId ? 'tercapai' : 'berjalan',
            branchId,
            updatedAt: new Date()
          });
        }
      }
    }

    console.log("=== STRICT SYNC COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("STRICT SYNC FAILED:", err);
  }
}

syncStrict();
