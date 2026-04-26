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
    
    const res = await client.query(`
      SELECT payment_method, COUNT(*) 
      FROM payments 
      GROUP BY payment_method
    `);
    
    console.log('Current payment methods in DB:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
