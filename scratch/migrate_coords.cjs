const { Client } = require('pg');
require('dotenv').config();

async function updateSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE units ALTER COLUMN sp_x TYPE NUMERIC(10,2)');
    await client.query('ALTER TABLE units ALTER COLUMN sp_y TYPE NUMERIC(10,2)');
    console.log('✅ Columns sp_x and sp_y updated to NUMERIC');
  } catch (err) {
    console.error('❌ Error updating schema:', err);
  } finally {
    await client.end();
  }
}

updateSchema();
