// @ts-nocheck
import { db } from "../server/db";
import { 
  transaksiPromo, pelangganProgram, paketProgress, 
  salesCustomers, paketMaster 
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function diagnose() {
  const customerName = "DUTA MOTOR BKL";
  console.log(`=== DIAGNOSING CUSTOMER: ${customerName} ===`);

  try {
    const custs = await db.select().from(salesCustomers).where(eq(salesCustomers.name, customerName));
    if (custs.length === 0) {
      console.log("Customer not found!");
      return;
    }
    const c = custs[0];
    console.log(`ID: ${c.id}, Code: ${c.code}, Branch: ${c.branchId}`);

    // 1. Transactions
    const txs = await db.select().from(transaksiPromo).where(eq(transaksiPromo.pelangganId, c.id));
    console.log(`\nTransactions found: ${txs.length}`);
    txs.forEach(t => {
      console.log(`- ${t.noFaktur}: Brand ${t.brandCode}, Qty ${t.qty}, Branch ${t.branchId}, Date ${t.tglFaktur}`);
    });

    // 2. Client Programs
    const progs = await db.select().from(pelangganProgram).where(eq(pelangganProgram.pelangganId, c.id));
    console.log(`\nPrograms Registered: ${progs.length}`);
    for (const p of progs) {
       const m = await db.select().from(paketMaster).where(eq(paketMaster.id, p.paketId)).limit(1);
       console.log(`- Brand ${p.brandCode}, Paket ${m[0]?.nama || '?'}, Branch ${p.branchId}, Status ${p.status}`);
    }

    // 3. Progress Records
    const progress = await db.select().from(paketProgress).where(eq(paketProgress.pelangganId, c.id));
    console.log(`\nProgress Records (Monitoring): ${progress.length}`);
    progress.forEach(p => {
       console.log(`- PaketID ${p.paketId}, Branch ${p.branchId}, Qty ${p.totalQty}, Nilai ${p.totalNilai}, Status ${p.status}`);
    });

  } catch (err) {
    console.error("DIAGNOSE FAILED:", err);
  }
}

diagnose();
