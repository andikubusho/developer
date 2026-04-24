const { Client } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL;

const client = new Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    
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
