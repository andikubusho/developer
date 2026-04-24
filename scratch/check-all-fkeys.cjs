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
    
    console.log('--- Foreign Keys: installments ---');
    const resInst = await client.query(`
        SELECT 
            conname AS constraint_name, 
            pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c 
        WHERE contype = 'f' AND conrelid = 'installments'::regclass
    `);
    console.table(resInst.rows);

    console.log('--- Foreign Keys: sales ---');
    const resSales = await client.query(`
        SELECT 
            conname AS constraint_name, 
            pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c 
        WHERE contype = 'f' AND conrelid = 'sales'::regclass
    `);
    console.table(resSales.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
