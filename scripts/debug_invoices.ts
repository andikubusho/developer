import { db } from "../server/db";
import { pointLogs, promoHasil, labelQuotas, transaksiPromo, salesCustomers } from "../shared/schema";
import { sql, inArray, eq } from "drizzle-orm";

async function checkInvoices() {
  const invoices = ['hjgjkhjklk', 'ffsfdf', 'sadsd'];
  console.log(`Checking Invoices: ${invoices.join(', ')}`);

  for (const inv of invoices) {
    console.log(`\n--- [INVOICE: ${inv}] ---`);
    
    // 1. Transaction
    const [tx] = await db.select().from(transaksiPromo).where(eq(transaksiPromo.noFaktur, inv)).limit(1);
    if (!tx) {
      console.log("X Transaksi tidak ditemukan di tabel transaksi_promo.");
      continue;
    }
    console.log(`V Transaksi ditemukan: ID=${tx.id}, Nilai=${tx.nilaiFaktur}, Pelanggan=${tx.pelangganId}, Brand=${tx.brandCode}`);

    // 2. Customer
    const [cust] = await db.select().from(salesCustomers).where(eq(salesCustomers.id, tx.pelangganId)).limit(1);
    console.log(`  Pelanggan: ${cust?.name || 'Unknown'} (Code: ${cust?.code || 'None'})`);

    // 3. Rewards
    const ph = await db.select().from(promoHasil).where(eq(promoHasil.transaksiId, tx.id));
    console.log(`  Cashback Found: ${ph.length}`);
    ph.forEach(h => console.log(`    - ID ${h.id}: Nilai ${h.nilaiCashback}`));

    const pl = await db.select().from(pointLogs).where(sql`TRIM(LOWER(${pointLogs.invoiceNumber})) = ${inv.toLowerCase()}`);
    console.log(`  Points Found: ${pl.length}`);
    pl.forEach(l => console.log(`    - ID ${l.id}: Point ${l.point} (Code: ${l.customerCode})`));

    const lq = await db.select().from(labelQuotas).where(sql`TRIM(LOWER(${labelQuotas.invoiceNumber})) = ${inv.toLowerCase()}`);
    console.log(`  Labels Found: ${lq.length}`);
    lq.forEach(q => console.log(`    - ID ${q.id}: Amount ${q.amount}`));
  }
}

checkInvoices().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
