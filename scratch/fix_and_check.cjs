const pkg = require('pg');
const { Client } = pkg;

// TARGET (SINGAPORE)
const SINGAPORE_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
// POTENTIAL BACKUP SOURCE (SEOUL)
const SEOUL_DB = "postgresql://postgres.yubjdtqcvbwevocfawib:vEBftPhnbrmYa6dz@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";

async function fixAndCheck() {
  const singapore = new Client({ connectionString: SINGAPORE_DB });
  const seoul = new Client({ connectionString: SEOUL_DB });

  try {
    await singapore.connect();
    console.log('✅ Connected to Singapore DB');

    // 1. Fix price_list_items schema
    console.log('Fixing price_list_items schema in Singapore...');
    await singapore.query(`ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    console.log('✅ Added created_at to price_list_items');

    // 2. Check Seoul DB for data
    try {
      await seoul.connect();
      console.log('✅ Connected to Seoul DB');
      
      const tablesToCheck = ['rab', 'purchase_requests', 'spks', 'spk', 'project_opnames', 'employees'];
      console.log('\\n--- Checking data in Seoul DB ---');
      
      for (const table of tablesToCheck) {
        try {
          const { rows } = await seoul.query(`SELECT count(*) FROM ${table}`);
          console.log(`Table ${table} count in Seoul: ${rows[0].count}`);
        } catch (e) {
          console.log(`Table ${table} not found or error in Seoul`);
        }
      }
    } catch (seoulErr) {
      console.log('❌ Could not connect to Seoul DB:', seoulErr.message);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await singapore.end();
    await seoul.end();
  }
}

fixAndCheck();
