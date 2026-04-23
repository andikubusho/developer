const pkg = require('pg');
const { Client } = pkg;

const TOKYO_DB = "postgresql://postgres.hkgxditpjggpodmaiovl:2NKTzfImaamphEWA@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";
const SINGAPORE_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

const TABLES = [
  'rab', 'purchase_requests', 'spks', 'spk', 'project_opnames', 
  'kpr_disbursement', 'supplier_payments', 'cash_flow', 
  'employees', 'attendance', 'payroll', 'audit_stock', 'audit_costs',
  'price_list_items', 'petty_cash', 'taxation', 'recruitment', 'ledger', 'general_journal'
];

async function sync() {
  const tokyo = new Client({ connectionString: TOKYO_DB });
  const singapore = new Client({ connectionString: SINGAPORE_DB });

  try {
    await tokyo.connect();
    await singapore.connect();
    console.log('🚀 Memulai migrasi data dari Tokyo ke Singapore...');

    for (const table of TABLES) {
      console.log(`\n--- Processing Table: ${table} ---`);
      
      // 1. Get Schema and Data from Tokyo
      const { rows: data } = await tokyo.query(`SELECT * FROM ${table}`);
      console.log(`Found ${data.length} rows in Tokyo.`);
      
      if (data.length === 0) continue;

      // 2. Ensure table/columns exist in Singapore
      // If price_list_items is missing created_at, add it
      if (table === 'price_list_items') {
        await singapore.query(`ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
      }

      // 3. Simple sync (Delete and Re-insert)
      // Warning: This is a brute-force sync for restoration
      await singapore.query(`TRUNCATE TABLE ${table} CASCADE`).catch(e => console.log(`Note: Truncate failed, continuing...`));
      
      const columns = Object.keys(data[0]);
      const colNames = columns.join(', ');
      
      for (const row of data) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        await singapore.query(`INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
      }
      
      console.log(`✅ Success: Migrated ${data.length} rows to ${table}`);
    }

    console.log('\n✨ MIGRASI SELESAI!');

  } catch (err) {
    console.error('❌ CRITICAL ERROR:', err.message);
  } finally {
    await tokyo.end();
    await singapore.end();
  }
}

sync();
