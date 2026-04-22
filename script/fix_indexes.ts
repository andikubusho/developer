import { pool } from "../server/db";

async function main() {
  console.log("[FIX] Connecting to database...");
  const client = await pool.connect();
  try {
    console.log("[FIX] Adding indexes to optimize performance...");
    
    const queries = [
      "CREATE INDEX IF NOT EXISTS point_logs_customer_idx ON point_logs(customer_code)",
      "CREATE INDEX IF NOT EXISTS point_logs_branch_idx ON point_logs(branch_id)",
      "CREATE INDEX IF NOT EXISTS point_logs_invoice_idx ON point_logs(invoice_number)",
      
      "CREATE INDEX IF NOT EXISTS label_quotas_customer_idx ON label_quotas(customer_code)",
      "CREATE INDEX IF NOT EXISTS label_quotas_branch_idx ON label_quotas(branch_id)",
      "CREATE INDEX IF NOT EXISTS label_quotas_invoice_idx ON label_quotas(invoice_number)",
      
      "CREATE INDEX IF NOT EXISTS pelanggan_program_pelanggan_idx ON pelanggan_program(pelanggan_id)",
      "CREATE INDEX IF NOT EXISTS pelanggan_program_branch_idx ON pelanggan_program(branch_id)",
      
      "CREATE INDEX IF NOT EXISTS cutting_progress_pelanggan_idx ON cutting_progress(pelanggan_id)",
      "CREATE INDEX IF NOT EXISTS cutting_progress_branch_idx ON cutting_progress(branch_id)",
      
      "CREATE INDEX IF NOT EXISTS paket_progress_pelanggan_idx ON paket_progress(pelanggan_id)",
      "CREATE INDEX IF NOT EXISTS paket_progress_branch_idx ON paket_progress(branch_id)",
      
      "CREATE INDEX IF NOT EXISTS transaksi_promo_pelanggan_idx ON transaksi_promo_new(pelanggan_id)",
      "CREATE INDEX IF NOT EXISTS transaksi_promo_branch_idx ON transaksi_promo_new(branch_id)",
      "CREATE INDEX IF NOT EXISTS transaksi_promo_brand_idx ON transaksi_promo_new(brand_code)",
      
      "CREATE INDEX IF NOT EXISTS promo_hasil_transaksi_idx ON promo_hasil(transaksi_id)",
      "CREATE INDEX IF NOT EXISTS promo_hasil_branch_idx ON promo_hasil(branch_id)"
    ];

    for (const q of queries) {
      console.log(`[FIX] Executing: ${q}`);
      await client.query(q);
    }
    
    console.log("[FIX] All indexes added successfully!");
  } catch (err) {
    console.error("[FIX] Error adding indexes:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
