
import pg from "pg";

async function cleanupDuplicates() {
  const connectionString = "postgresql://postgres.yubjdtqcvbwevocfawib:vEBftPhnbrmYa6dz@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  
  console.log("Starting cleanup of duplicate sales_customers...");

  try {
    // 1. Find duplicate codes in sales_customers
    const res = await pool.query(`
      SELECT code, count(*), string_agg(id::text, ',') as ids
      FROM sales_customers
      GROUP BY code
      HAVING count(*) > 1
    `);

    if (res.rows.length === 0) {
      console.log("No duplicates found in sales_customers.");
    } else {
      console.log(`Found ${res.rows.length} duplicate groups in sales_customers.`);
      for (const group of res.rows) {
        const ids = group.ids.split(',').map(Number).sort((a, b) => a - b);
        const keepId = ids[0];
        const deleteIds = ids.slice(1);

        console.log(`Processing code '${group.code}': keeping ID ${keepId}, deleting IDs ${deleteIds.join(', ')}`);

        // Update related records
        // sales_customers is referenced by shipments (customerId - integer)
        const updateShipments = await pool.query(
          "UPDATE shipments SET customer_id = $1 WHERE customer_id = ANY($2)",
          [keepId, deleteIds]
        );
        console.log(`  Updated ${updateShipments.rowCount} rows in shipments.`);

        // Delete duplicates
        const deleteRes = await pool.query(
          "DELETE FROM sales_customers WHERE id = ANY($1)",
          [deleteIds]
        );
        console.log(`  Deleted ${deleteRes.rowCount} duplicate customer records.`);
      }
    }

    console.log("Cleanup completed successfully.");
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    await pool.end();
  }
}

cleanupDuplicates();
