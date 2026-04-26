const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diag() {
  try {
    await client.connect();
    console.log('--- DIAGNOSTIC: Deposits & Cash Flow ---');
    
    console.log('\n[1] Sample Deposits:');
    const deposits = await client.query('SELECT id, name, phone, status FROM deposits LIMIT 5');
    console.table(deposits.rows);

    console.log('\n[2] Sample Cash Flow (Pending/Verified):');
    const cf = await client.query('SELECT id, description, reference_id, reference_type, status FROM cash_flow WHERE reference_type IS NOT NULL LIMIT 5');
    console.table(cf.rows);

    console.log('\n[3] Orphan Check: Cash Flow without Status or Ref Type:');
    const orphans = await client.query('SELECT count(*) FROM cash_flow WHERE status IS NULL OR reference_type IS NULL');
    console.log('Count:', orphans.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

diag();
