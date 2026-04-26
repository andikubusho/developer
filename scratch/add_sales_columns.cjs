const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL
});

async function migrate() {
  console.log('--- ADDING MISSING COLUMNS TO SALES TABLE ---');
  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    const queries = [
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS final_price NUMERIC DEFAULT 0;`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS booking_fee NUMERIC DEFAULT 0;`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS dp_amount NUMERIC DEFAULT 0;`
    ];

    for (const sql of queries) {
      await client.query(sql);
      console.log(`Executed: ${sql}`);
    }

    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

migrate();
