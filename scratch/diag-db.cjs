const { Client } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL;
console.log('Connecting to:', url.replace(/:([^@]+)@/, ":****@"));

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected!');
    
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:');
    console.table(res.rows);

    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales'
    `);
    console.log('Columns in sales:');
    console.table(columns.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
