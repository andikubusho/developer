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
    
    console.log('Adding promo_id foreign key to sales table...');
    
    // Add FK pointing to promos
    await client.query(`
        ALTER TABLE sales 
        ADD CONSTRAINT sales_promo_id_fkey 
        FOREIGN KEY (promo_id) REFERENCES promos(id)
        ON DELETE SET NULL
    `);
    
    console.log('Foreign key added successfully!');

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
