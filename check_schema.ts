import { pool } from "./server/db";
import "dotenv/config";

async function listTables() {
  try {
    const client = await pool.connect();
    console.log("Listing all tables...");
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables:", res.rows.map(r => r.table_name));

    const checkTable = async (tableName) => {
      console.log(`\nChecking columns for ${tableName}...`);
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `);
      console.log(`${tableName} columns:`, cols.rows);
    };

    const targetTables = res.rows
      .map(r => r.table_name)
      .filter(name => name.includes('promo') || name.includes('transaksi'));
    
    for (const table of targetTables) {
      await checkTable(table);
    }

    client.release();
    process.exit(0);
  } catch (err) {
    console.error("Error listing tables:", err);
    process.exit(1);
  }
}

listTables();
