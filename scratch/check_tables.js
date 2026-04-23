import pkg from 'pg';
const { Client } = pkg;

const TARGET_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

async function checkTables() {
  const client = new Client({ connectionString: TARGET_DB });
  try {
    await client.connect();
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = rows.map(r => r.table_name);
    console.log('--- TABEL YANG SUDAH ADA ---');
    console.log(existingTables.join(', '));
    console.log('---------------------------');
  } catch (err) {
    console.error('Gagal mengecek tabel:', err.message);
  } finally {
    await client.end();
  }
}

checkTables();
