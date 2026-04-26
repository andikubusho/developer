const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL
});

async function checkPaymentsTable() {
  console.log('Checking payments table columns...');
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments'
    `);
    console.log('Columns in payments:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkPaymentsTable();
