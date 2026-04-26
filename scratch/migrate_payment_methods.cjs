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
    
    console.log('Migrating payment methods in payments table...');
    const res1 = await client.query(`
      UPDATE payments 
      SET payment_method = 'Transfer Bank' 
      WHERE payment_method IN ('transfer', 'bank_transfer');
    `);
    console.log(`Updated ${res1.rowCount} records to 'Transfer Bank'`);

    const res2 = await client.query(`
      UPDATE payments 
      SET payment_method = 'Tunai' 
      WHERE payment_method = 'cash';
    `);
    console.log(`Updated ${res2.rowCount} records to 'Tunai'`);

    // Verify
    const resFinal = await client.query(`
      SELECT payment_method, COUNT(*) 
      FROM payments 
      GROUP BY payment_method
    `);
    console.table(resFinal.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
