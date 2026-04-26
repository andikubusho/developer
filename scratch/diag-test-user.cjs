const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diag() {
  try {
    await client.connect();
    console.log('--- TARGETED DIAGNOSTIC ---');
    
    const query = `
      SELECT 
        id, 
        description, 
        amount, 
        status, 
        reference_id, 
        reference_type 
      FROM cash_flow 
      WHERE description ILIKE '%Test User%'
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
