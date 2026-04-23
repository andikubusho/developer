const pkg = require('pg');
const { Client } = pkg;

const TARGET_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new Client({ connectionString: TARGET_DB });
  try {
    await client.connect();
    const sql = process.argv[2];
    const res = await client.query(sql);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
