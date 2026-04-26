const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('--- Running Migration: Adding status and reference_type to cash_flow ---');
    
    // 1. Add columns
    await client.query(`
      ALTER TABLE cash_flow 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS reference_type text;
    `);
    
    // 2. Set reference_type for existing records (heuristic)
    // Most existing ones are likely from deposits or payments based on category
    await client.query(`
      UPDATE cash_flow SET reference_type = 'deposit' WHERE category = 'Titipan Konsumen' AND reference_type IS NULL;
      UPDATE cash_flow SET reference_type = 'payment' WHERE category = 'Penjualan Unit' AND reference_type IS NULL;
      UPDATE cash_flow SET status = 'verified' WHERE status IS NULL;
    `);

    // 3. Add unique index
    // Note: If there are existing duplicates, this might fail. 
    // I'll check for duplicates first.
    const dupCheck = await client.query(`
      SELECT reference_id, reference_type, count(*) 
      FROM cash_flow 
      WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL
      GROUP BY reference_id, reference_type
      HAVING count(*) > 1;
    `);

    if (dupCheck.rows.length > 0) {
      console.log('⚠️ Duplicates found. Cleaning up...');
      for (const row of dupCheck.rows) {
        // Keep the newest one
        await client.query(`
          DELETE FROM cash_flow a 
          USING cash_flow b 
          WHERE a.id < b.id 
          AND a.reference_id = $1 
          AND a.reference_type = $2
          AND b.reference_id = $1 
          AND b.reference_type = $2;
        `, [row.reference_id, row.reference_type]);
      }
    }

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uidx_cash_flow_ref ON cash_flow (reference_id, reference_type);
    `);

    console.log('✅ Migration successful.');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
