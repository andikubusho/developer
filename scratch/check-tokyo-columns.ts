
import pkg from 'pg';
const { Client } = pkg;

const TOKYO_DB = "postgresql://postgres.hkgxditpjggpodmaiovl:2NKTzfImaamphEWA@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function checkTokyo() {
  const client = new Client({ connectionString: TOKYO_DB });
  try {
    await client.connect();
    console.log("Connected to Tokyo DB");
    
    const tables = ['supplier_payments', 'supplier_payment'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
      console.log(`\nColumns in ${table} (Tokyo):`);
      console.table(result.rows);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

checkTokyo();
