
import { db } from "./server/db.js";
import { transaksiPromo, salesCustomers } from "./shared/schema.js";
import { eq, and, desc } from "drizzle-orm";

async function verify() {
  const branchId = 2; // PJM where Petronas is
  
  console.log(`Verifying transactions for Branch ${branchId}...`);
  
  const rawData = await db
    .select({
      id: transaksiPromo.id,
      brandCode: transaksiPromo.brandCode,
      noFaktur: transaksiPromo.noFaktur,
      pelangganName: salesCustomers.name,
    })
    .from(transaksiPromo)
    .leftJoin(salesCustomers, eq(transaksiPromo.pelangganId, salesCustomers.id))
    .where(eq(transaksiPromo.branchId, branchId))
    .orderBy(desc(transaksiPromo.createdAt));

  console.log(`Found ${rawData.length} transactions:`);
  console.table(rawData.filter(t => t.brandCode === 'Petronas'));
}

verify().catch(console.error).finally(() => process.exit(0));
