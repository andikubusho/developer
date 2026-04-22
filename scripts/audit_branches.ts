import { db } from "../server/db";
import { branches, transaksiPromo, pelangganProgram, paketMaster } from "../shared/schema";

async function audit() {
  console.log("=== BRANCH AUDIT ===");
  const bList = await db.select().from(branches);
  bList.forEach(b => console.log(`[ID ${b.id}] ${b.name} (${b.code})`));

  console.log("\n=== CROSS-BRANCH DATA CHECK ===");
  // Table: transaksiPromo
  const txs = await db.select().from(transaksiPromo);
  console.log(`- Transactions: ${txs.length}`);
  const badTxs = txs.filter(t => !t.branchId);
  console.log(`  (Null Branch: ${badTxs.length})`);

  // Table: pelangganProgram
  const progs = await db.select().from(pelangganProgram);
  console.log(`- Program Registrations: ${progs.length}`);
  const badProgs = progs.filter(p => !p.branchId);
  console.log(`  (Null Branch: ${badProgs.length})`);

  // Table: paketMaster
  const masters = await db.select().from(paketMaster);
  console.log(`- Paket Masters: ${masters.length}`);
  const badMasters = masters.filter(m => !m.branchId);
  console.log(`  (Null Branch: ${badMasters.length})`);
}
audit();
