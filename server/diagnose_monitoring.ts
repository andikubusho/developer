
import { db } from "./db";
import { 
  transaksiPromo, promoHasil, salesCustomers,
  pointSaldo, cuttingProgress, paketProgress
} from "../shared/schema";
import { eq, sql, inArray } from "drizzle-orm";

async function mockRun() {
  const branchId = 2;
  console.log(`--- MOCK RUN MONITORING BRANCH ${branchId} ---`);

  const belanjaTotals = await db.select({
    pelangganId: transaksiPromo.pelangganId,
    totalNilai: sql<string>`SUM(${transaksiPromo.nilaiFaktur})`,
    totalQty: sql<string>`SUM(${transaksiPromo.qty})`
  })
  .from(transaksiPromo)
  .where(eq(transaksiPromo.branchId, branchId))
  .groupBy(transaksiPromo.pelangganId);

  console.log(`Belanja Totals: ${belanjaTotals.length} records.`);
  
  const allPelangganIds = new Set<number>();
  belanjaTotals.forEach(b => { if (b.pelangganId) allPelangganIds.add(b.pelangganId); });

  console.log(`Total Pelanggan IDs Collected: ${allPelangganIds.size}`);
  
  if (allPelangganIds.size > 0) {
    const ids = Array.from(allPelangganIds);
    console.log(`Involved IDs: ${ids.join(", ")}`);
    
    const involvedCustomers = await db.select()
      .from(salesCustomers)
      .where(inArray(salesCustomers.id, ids));
    
    console.log(`Involved Customers Found: ${involvedCustomers.length}`);
    involvedCustomers.forEach(c => console.log(` - ${c.id}: ${c.name} (${c.code})`));
  } else {
    console.log("No Pelanggan IDs collected from ANY source.");
  }

  process.exit(0);
}

mockRun().catch(console.error);
