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
    console.log('Connected!');
    
    console.log('Migrating Petty Cash table...');
    await client.query(`
        ALTER TABLE petty_cash 
        ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'out',
        ADD COLUMN IF NOT EXISTS requested_by TEXT,
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    `);

    console.log('Migrating Taxation table...');
    await client.query(`
        ALTER TABLE taxation 
        ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS type TEXT,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid',
        ADD COLUMN IF NOT EXISTS due_date DATE;
    `);

    console.log('Migrating Payroll table...');
    await client.query(`
        ALTER TABLE payroll 
        ADD COLUMN IF NOT EXISTS period TEXT,
        ADD COLUMN IF NOT EXISTS basic_salary NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS allowances NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS deductions NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_date DATE;
    `);

    console.log('Database migration complete!');

    // Notify PostgREST to reload schema
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('PostgREST schema reload signaled.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
