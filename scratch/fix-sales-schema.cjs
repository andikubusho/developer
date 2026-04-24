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
    
    console.log('Adding missing columns to sales table...');
    await client.query(`
      ALTER TABLE sales 
      ADD COLUMN IF NOT EXISTS booking_fee NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS booking_fee_date DATE,
      ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS promo_id UUID,
      ADD COLUMN IF NOT EXISTS final_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS supervisor TEXT,
      ADD COLUMN IF NOT EXISTS manager TEXT,
      ADD COLUMN IF NOT EXISTS makelar TEXT,
      ADD COLUMN IF NOT EXISTS freelance TEXT;
    `);
    console.log('Columns added successfully!');

    // Notify PostgREST to reload schema
    try {
        await client.query("NOTIFY pgrst, 'reload schema'");
        console.log('PostgREST schema reload signaled.');
    } catch (e) {
        console.log('Note: PostgREST reload signal failed (might not be using pgrst notifier):', e.message);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
