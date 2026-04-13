
import { db } from "./server/db";
import { transaksiPromo, salesCustomers } from "./shared/schema";
import { sql } from "drizzle-orm";

async function checkData() {
  try {
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(transaksiPromo);
    console.log("Total records in transaksi_promo_new:", countResult[0].count);

    const samples = await db.select().from(transaksiPromo).limit(5);
    console.log("Sample records:", JSON.stringify(samples, null, 2));

    const joinCheck = await db.select({ count: sql<number>`count(*)` })
      .from(transaksiPromo)
      .innerJoin(salesCustomers, sql`${transaksiPromo.pelangganId} = ${salesCustomers.id}`);
    console.log("Records with valid customer join:", joinCheck[0].count);

  } catch (err) {
    console.error("Database check failed:", err);
  } finally {
    process.exit(0);
  }
}

checkData();
