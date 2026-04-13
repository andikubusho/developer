import { db } from "../server/db";
import { pointHadiah, pointRule, pointReward, pointSaldo, pelangganProgram, pointMaster } from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

async function simulatePreview(pelangganId: number, brandCode: string, branchId: number, qty: number, nilaiFaktur: number) {
  console.log(`--- Simulasi Preview Pelanggan ${pelangganId}, Brand ${brandCode}, Qty ${qty} ---`);
  
  // Logic from calculatePromos
  const mappings = await db.select().from(pelangganProgram).where(and(
    eq(pelangganProgram.pelangganId, pelangganId),
    eq(pelangganProgram.brandCode, brandCode),
    eq(pelangganProgram.branchId, branchId),
    eq(pelangganProgram.status, 'aktif'),
    eq(pelangganProgram.jenisProgram, 'point')
  ));

  if (mappings.length === 0) return console.log("No point mapping found.");
  const mapping = mappings[0];

  const pg = await db.select().from(pointHadiah).where(and(
    eq(pointHadiah.id, mapping.referensiId),
    eq(pointHadiah.status, 'aktif')
  )).limit(1);

  let peroleh = 0;
  if (pg.length > 0) {
    const rules = await db.select().from(pointRule).where(eq(pointRule.programId, pg[0].id));
    for (const r of rules) {
       if (r.tipe === 'qty') peroleh += Math.floor(qty / Number(r.nilaiKonversi)) * Number(r.poinDihasilkan);
       if (r.tipe === 'nominal') peroleh += Math.floor(nilaiFaktur / Number(r.nilaiKonversi)) * Number(r.poinDihasilkan);
    }
  } else {
    const pm = await db.select().from(pointMaster).where(eq(pointMaster.id, mapping.referensiId)).limit(1);
    if (pm.length > 0) peroleh = qty * Number(pm[0].poinPerQty);
  }

  const ps = await db.select().from(pointSaldo).where(and(
    eq(pointSaldo.pelangganId, pelangganId),
    eq(pointSaldo.brandCode, brandCode)
  )).limit(1);
  
  const oldSaldo = ps.length > 0 ? Number(ps[0].saldoPoin) : 0;
  const saldoBaru = oldSaldo + peroleh;

  // Reward Detection
  let achievedReward = null;
  const activeProg = await db.select().from(pointHadiah).where(and(
    eq(pointHadiah.brandCode, brandCode),
    eq(pointHadiah.status, 'aktif'),
    eq(pointHadiah.branchId, branchId)
  )).limit(1);
  
  if (activeProg.length > 0) {
    const rewards = await db.select().from(pointReward).where(eq(pointReward.programId, activeProg[0].id)).orderBy(desc(pointReward.pointDibutuhkan));
    for (const rw of rewards) {
      if (saldoBaru >= rw.pointDibutuhkan) {
        achievedReward = rw.namaHadiah;
        break;
      }
    }
  }

  console.log("Old Saldo:", oldSaldo);
  console.log("Earned:", peroleh);
  console.log("New Saldo:", saldoBaru);
  console.log("Achieved Reward:", achievedReward);
}

async function runTests() {
  // Test with Pelanggan 26 (KENDA) - which has old pointMaster mapping (ID 8)
  // Current mapping ID 8 has poinPerQty = 1
  await simulatePreview(26, "KENDA", 2, 200, 1000000); // 0 -> 200: Bor Impact
  await simulatePreview(26, "KENDA", 2, 400, 2000000); // 0 -> 400: Kulkas Mini
}

runTests();
