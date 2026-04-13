
import { db } from "./server/db.js";
import { transaksiPromo, promoBrands } from "./shared/schema.js";
import { or, eq, sql } from "drizzle-orm";

async function check() {
  const brands = await db.select().from(promoBrands);
  console.table(brands);

  const txs = await db.select().from(transaksiPromo).where(or(eq(transaksiPromo.noFaktur, 'FFSFDFF'), eq(transaksiPromo.noFaktur, 'VERIFY-OK-01')));
  console.table(txs);
  
  const allTxs = await db.select({
    id: transaksiPromo.id,
    brandCode: transaksiPromo.brandCode,
    branchId: transaksiPromo.branchId,
    noFaktur: transaksiPromo.noFaktur,
  }).from(transaksiPromo).orderBy(transaksiPromo.createdAt).limit(20);
  console.table(allTxs);
}

check().catch(console.error).finally(() => process.exit(0));
