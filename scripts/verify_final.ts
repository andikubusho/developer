import { db } from "../server/db";
import { paketProgress, transaksiPromo, salesCustomers } from "../shared/schema";
import { count, eq } from "drizzle-orm";

async function verify() {
  console.log("=== FINAL VERIFICATION ===");
  
  const prog = await db.select().from(paketProgress);
  console.log(`Paket Progress stored: ${prog.length}`);
  prog.forEach(p => {
    console.log(`- Paket ${p.paketId}, Cust ${p.pelangganId}, Branch ${p.branchId}, Qty ${p.totalQty}`);
  });

  const txs = await db.select().from(transaksiPromo);
  console.log(`\nTransactions stored: ${txs.length}`);
  txs.forEach(t => {
     console.log(`- TX ${t.noFaktur}, Branch ${t.branchId}, Brand ${t.brandCode}`);
  });

  console.log("\n=== NULL BRANCH CHECK ===");
  const badT = await db.select({ val: count() }).from(transaksiPromo).where(eq(transaksiPromo.branchId, null as any));
  const badP = await db.select({ val: count() }).from(paketProgress).where(eq(paketProgress.branchId, null as any));
  console.log(`Global Transactions: ${badT[0].val}`);
  console.log(`Global Progress: ${badP[0].val}`);
}
verify();
