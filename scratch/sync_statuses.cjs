const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function sync() {
  try {
    await client.connect();
    console.log('--- SYNC: Aligning Source Status with Cash Flow ---');
    
    // 1. Find all deposits where cash_flow says pending
    const pendingDeposits = await client.query(`
      SELECT reference_id FROM cash_flow 
      WHERE reference_type = 'deposit' AND status = 'pending'
    `);
    
    for (const row of pendingDeposits.rows) {
      console.log(`Setting Deposit ${row.reference_id} to pending`);
      await client.query("UPDATE deposits SET status = 'pending' WHERE id = $1 AND status != 'used'", [row.reference_id]);
    }

    // 2. Find all deposits where cash_flow says verified
    const verifiedDeposits = await client.query(`
      SELECT reference_id FROM cash_flow 
      WHERE reference_type = 'deposit' AND status = 'verified'
    `);
    
    for (const row of verifiedDeposits.rows) {
      console.log(`Setting Deposit ${row.reference_id} to verified`);
      await client.query("UPDATE deposits SET status = 'verified' WHERE id = $1 AND status = 'pending'", [row.reference_id]);
    }

    // 3. Repeat for Payments
    const pendingPayments = await client.query(`
      SELECT reference_id FROM cash_flow 
      WHERE reference_type = 'payment' AND status = 'pending'
    `);
    
    for (const row of pendingPayments.rows) {
      console.log(`Setting Payment ${row.reference_id} to pending`);
      await client.query("UPDATE payments SET status = 'pending' WHERE id = $1", [row.reference_id]);
    }

    console.log('✅ Sync completed.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

sync();
