const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkCustomers() {
  try {
    await client.connect();
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customers'");
    console.log('--- KOLOM TABEL CUSTOMERS ---');
    console.log(res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

checkCustomers();
