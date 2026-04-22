
import { db, pool } from "./server/db";
import { transaksiPromo, salesCustomers } from "./shared/schema";
import { sql, eq } from "drizzle-orm";

async function runMigration() {
  console.log("[Migration] Starting promo transaction migration...");
  try {
    // 1. Check for legacy tables
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('promo_transactions', 'transaksi_promo', 'promo_inputs')
    `);
    
    const tables = tableCheck.rows.map(r => r.table_name);
    console.log("[Migration] Tables detected in DB:", tables);

    // 2. If 'promo_inputs' exists
    if (tables.includes('promo_inputs')) {
      const countRes = await db.execute(sql`SELECT count(*) FROM promo_inputs`);
      const count = Number(countRes.rows[0].count);
      console.log(`[Migration] Legacy promo_inputs has ${count} records.`);

      if (count > 0) {
          const migrateSql = sql`
            INSERT INTO transaksi_promo_new (pelanggan_id, no_faktur, tgl_faktur, qty, nilai_faktur, branch_id, brand_code)
            SELECT sc.id, pi.invoice_number, pi.date, 1, pi.invoice_total, pi.branch_id, 'FERIO'
            FROM promo_inputs pi
            JOIN sales_customers sc ON sc.code = pi.customer_code
            WHERE NOT EXISTS (
              SELECT 1 FROM transaksi_promo_new tpn WHERE tpn.no_faktur = pi.invoice_number
            )
          `;
          const result = await db.execute(migrateSql);
          console.log(`[Migration] Migrated ${result.rowCount} records from promo_inputs.`);
      }
    }

    // 3. Branch Verification & Fix
    const fixSql = sql`
      UPDATE transaksi_promo_new tp
      SET branch_id = sc.branch_id
      FROM sales_customers sc
      WHERE tp.pelanggan_id = sc.id AND (tp.branch_id IS NULL OR tp.branch_id = 0)
    `;
    const fixResult = await db.execute(fixSql);
    console.log(`[Migration] Updated branch_id for ${fixResult.rowCount} transactions based on customer branch.`);

    // 4. Double check counts per branch
    const b1Count = await db.select({ count: sql<number>`count(*)` }).from(transaksiPromo).where(eq(transaksiPromo.branchId, 1));
    const b2Count = await db.select({ count: sql<number>`count(*)` }).from(transaksiPromo).where(eq(transaksiPromo.branchId, 2));
    console.log(`[Migration] Final counts - Branch 1: ${b1Count[0].count}, Branch 2: ${b2Count[0].count}`);

    console.log("[Migration] Completed successfully.");
  } catch (err: any) {
    console.error("[Migration] FATAL ERROR:", err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
