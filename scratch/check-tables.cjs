const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const tables = ['projects', 'units', 'price_list_items', 'customers', 'leads', 'marketing_staff', 'promos'];
  for (const t of tables) {
    const res = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${t}')`);
    console.log(`${t}: ${res.rows[0].exists}`);
  }
  await client.end();
}

run();
