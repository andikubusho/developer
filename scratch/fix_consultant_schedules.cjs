const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('--- Fixing consultant_schedules schema ---');
    
    // Rename staff_id to consultant_id
    console.log('Renaming staff_id to consultant_id...');
    await client.query('ALTER TABLE consultant_schedules RENAME COLUMN staff_id TO consultant_id;');
    
    // Rename activity to position (if it exists and position doesn't)
    console.log('Renaming activity to position...');
    await client.query('ALTER TABLE consultant_schedules RENAME COLUMN activity TO position;');
    
    console.log('Schema fixed successfully!');

  } catch (err) {
    console.error('Error fixing schema:', err.message);
  } finally {
    await client.end();
  }
}

run();
