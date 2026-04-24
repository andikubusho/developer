const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT status, count(*) FROM price_list_items GROUP BY status");
  console.table(res.rows);
  await client.end();
}

run();
