const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diag() {
  try {
    await client.connect();
    console.log('--- JOINED DIAGNOSTIC: Deposits & Cash Flow ---');
    
    const query = `
      SELECT 
        d.id as dep_id, 
        d.name, 
        d.status as dep_status, 
        cf.id as cf_id, 
        cf.status as cf_status,
        cf.reference_type
      FROM deposits d
      LEFT JOIN cash_flow cf ON d.id = cf.reference_id AND cf.reference_type = 'deposit'
      ORDER BY d.created_at DESC
      LIMIT 10
    `;
    const res = await client.query(query);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

diag();
