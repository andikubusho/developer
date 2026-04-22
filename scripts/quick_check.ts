import { db } from "../server/db";
import { salesCustomers, transaksiPromo, pelangganProgram, paketProgress } from "../shared/schema";

async function check() {
  console.log("--- Customers ---");
  const custs = await db.select().from(salesCustomers);
  custs.forEach(c => console.log(`ID: ${c.id}, Name: [${c.name}], Branch: ${c.branchId}`));

  console.log("\n--- Promo Transactions ---");
  const txs = await db.select().from(transaksiPromo);
  txs.forEach(t => console.log(`ID: ${t.id}, CustID: ${t.pelangganId}, Brand: ${t.brandCode}, Branch: ${t.branchId}`));

  console.log("\n--- Paket Progress ---");
  const prog = await db.select().from(paketProgress);
  prog.forEach(p => console.log(`ID: ${p.id}, CustID: ${p.pelangganId}, PaketId: ${p.paketId}, Branch: ${p.branchId}, Qty: ${p.totalQty}`));
}
check();
