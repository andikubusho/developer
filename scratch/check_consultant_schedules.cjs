const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('--- Columns in consultant_schedules ---');
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consultant_schedules'
      ORDER BY ordinal_position;
    `);
    res.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    console.log('\n--- Columns in consultants ---');
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'consultants'
      ORDER BY ordinal_position;
    `);
    res2.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
