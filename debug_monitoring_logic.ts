
import { db } from "./server/db";
import { 
  transaksiPromo, paketProgress, cuttingProgress, pointSaldo, 
  promoHasil, promoInputs, salesCustomers, branches 
} from "./shared/schema";
import { sql, eq, inArray, and } from "drizzle-orm";

async function debugMonitoring(branchId: number) {
  console.log(`--- DEBUG MONITORING FOR BRANCH ID: ${branchId} ---`);

  // 1. All relevant datasets
  const paket = await db.select().from(paketProgress).where(eq(paketProgress.branchId, branchId));
  console.log(`Paket Progress count: ${paket.length}`);

  const cutting = await db.select().from(cuttingProgress).where(eq(cuttingProgress.branchId, branchId));
  console.log(`Cutting Progress count: ${cutting.length}`);

  const point = await db.select().from(pointSaldo).where(eq(pointSaldo.branchId, branchId));
  console.log(`Point Saldo count: ${point.length}`);

  const cbNew = await db.select().from(promoHasil)
    .innerJoin(transaksiPromo, eq(promoHasil.transaksiId, transaksiPromo.id))
    .where(eq(transaksiPromo.branchId, branchId));
  console.log(`Cashback New count: ${cbNew.length}`);

  const cbOld = await db.select().from(promoInputs).where(eq(promoInputs.branchId, branchId));
  console.log(`Cashback Old (promo_inputs) count: ${cbOld.length}`);

  const belanja = await db.select().from(transaksiPromo).where(eq(transaksiPromo.branchId, branchId));
  console.log(`Transaksi Promo count: ${belanja.length}`);

  // Identification
  const allIds = new Set<number>();
  paket.forEach(p => allIds.add(p.pelangganId));
  cutting.forEach(l => allIds.add(l.pelangganId));
  point.forEach(p => allIds.add(p.pelangganId));
  cbNew.forEach(c => allIds.add(c.transaksi_promo_new.pelangganId));
  cbOld.forEach(c => {
     // Wait! I don't have pelangganId in promo_inputs, I have customerCode
     // I need to look up these codes
  });
  belanja.forEach(b => allIds.add(b.pelangganId));

  console.log(`Unique Pelanggan IDs collected: ${allIds.size}`, Array.from(allIds));

  if (allIds.size > 0) {
    const customers = await db.select().from(salesCustomers).where(inArray(salesCustomers.id, Array.from(allIds)));
    console.log(`Involved Sales Customers found: ${customers.length}`);
    customers.forEach(c => console.log(` - ${c.name} (Code: ${c.code}, ID: ${c.id})`));
  } else {
    console.log("No IDs found, aborting customer fetch.");
  }

  process.exit(0);
}

const targetBranch = process.argv[2] ? parseInt(process.argv[2]) : 2;
debugMonitoring(targetBranch).catch(err => {
  console.error(err);
  process.exit(1);
});
