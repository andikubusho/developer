// @ts-nocheck
import { db } from "../server/db";
import { 
  transaksiPromo, pelangganProgram, paketProgress, 
  salesCustomers, paketMaster 
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function diagnose() {
  console.log("=== FULL SYSTEM DIAGNOSIS ===");

  // 1. Get Customer ID 64 (DUTA MOTOR BKL)
  const cust = await db.select().from(salesCustomers).where(eq(salesCustomers.id, 64)).limit(1);
  console.log("Customer:", cust[0]);

  // 2. Get All Paket Masters
  const masters = await db.select().from(paketMaster);
  console.log("\nPaket Masters:", masters.length);
  masters.forEach(m => console.log(`- ID ${m.id}: ${m.nama} (Brand: ${m.brandCode}, Start: ${m.startDate})`));

  // 3. Get Registered Programs
  const progs = await db.select().from(pelangganProgram).where(eq(pelangganProgram.pelangganId, 64));
  console.log("\nRegistered Programs (Pelanggan ID 64):", progs.length);
  progs.forEach(p => console.log(`- Program ID ${p.id}, Paket ID: ${p.paketId}, Brand: ${p.brandCode}, Branch: ${p.branchId}`));

  // 4. Get Transactions
  const txs = await db.select().from(transaksiPromo).where(eq(transaksiPromo.pelangganId, 64));
  console.log("\nTransactions (Pelanggan ID 64):", txs.length);
  txs.forEach(t => console.log(`- TX ID ${t.id}, Brand: ${t.brandCode}, Qty: ${t.qty}, Branch: ${t.branchId}, Nilai: ${t.nilaiFaktur}`));

  // 5. Get Progress
  const prog = await db.select().from(paketProgress).where(eq(paketProgress.pelangganId, 64));
  console.log("\nProgress (Pelanggan ID 64):", prog.length);
  prog.forEach(p => console.log(`- ID ${p.id}, Paket ID: ${p.paketId}, Qty: ${p.totalQty}, Nilai: ${p.totalNilai}, Branch: ${p.branchId}`));
}
diagnose();
