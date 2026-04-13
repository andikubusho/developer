const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'point_master'");
    console.log("COLUMNS FOR point_master:", JSON.stringify(res.rows));
    
    const res2 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'paket_master'");
    console.log("COLUMNS FOR paket_master:", JSON.stringify(res2.rows));

    const res3 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cashback_master'");
    console.log("COLUMNS FOR cashback_master:", JSON.stringify(res3.rows));

  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);
