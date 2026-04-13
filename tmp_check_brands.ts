
import { db } from "./server/db.js";
import { promoBrands, transaksiPromo } from "./shared/schema.js";
import { sql } from "drizzle-orm";

async function check() {
  const brands = await db.select().from(promoBrands);
  console.log("Brands in promo_brandsTable:");
  console.table(brands);

  const txs = await db.select().from(transaksiPromo).limit(10);
  console.log("Recent Transactions in transaksi_promo_new:");
  console.table(txs);
  
  const petronasTxs = await db.select().from(transaksiPromo).where(sql`LOWER(brand_code) = 'petronas'`);
  console.log("Petronas Transactions:");
  console.table(petronasTxs);
}

check().catch(console.error).finally(() => process.exit(0));
