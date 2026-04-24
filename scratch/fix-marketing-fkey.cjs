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
    
    console.log('Fixing sales_marketing_id_fkey to point to marketing_staff...');
    
    // Drop existing FK
    await client.query(`ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_marketing_id_fkey`);
    
    // Add new FK pointing to marketing_staff
    await client.query(`ALTER TABLE sales ADD CONSTRAINT sales_marketing_id_fkey FOREIGN KEY (marketing_id) REFERENCES marketing_staff(id)`);
    
    console.log('Foreign key fixed successfully!');

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
