const { Client } = require('pg');

const url = "postgresql://postgres.hkgxditpjggpodmaiovl:2NKTzfImaamphEWA@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Tokyo DB!');
    
    const res = await client.query(`
        SELECT 
            conname AS constraint_name, 
            pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c 
        JOIN pg_namespace n ON n.oid = c.connamespace 
        WHERE contype = 'f' AND conrelid = 'sales'::regclass
    `);
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
