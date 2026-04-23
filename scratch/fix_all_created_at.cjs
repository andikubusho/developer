const pkg = require('pg');
const { Client } = pkg;

const TARGET_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function fixAllTables() {
  const client = new Client({ connectionString: TARGET_DB });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    
    for (const row of rows) {
      try {
        await client.query(`ALTER TABLE "${row.table_name}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
      } catch (e) {
        // ignore errors for views or tables where it can't be added
      }
    }
    console.log('✅ Added created_at to all tables to prevent future 400 errors');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixAllTables();
