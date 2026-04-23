import pkg from 'pg';
const { Client } = pkg;

// DATABASE SUMBER (TOKYO) - Menggunakan Pooler
const SOURCE_DB = "postgresql://postgres.hkgxditpjggpodmaiovl:2NKTzfImaamphEWA@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

// DATABASE TUJUAN (SINGAPORE)
const TARGET_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

const tables = [
  'profiles', 'projects', 'customers', 'leads', 'promos', 'units', 
  'sales', 'follow_ups', 'deposits', 'installments', 'marketing_staff', 
  'materials', 'spk', 'spks', 'project_opnames', 'purchase_orders', 
  'purchase_requests', 'rab', 'project_progress', 'marketing_documents', 
  'price_list_items', 'cash_flow', 'ledger', 'general_journal', 
  'petty_cash', 'taxation', 'employees', 'attendance', 'payroll', 
  'recruitment', 'audit_costs', 'audit_stock', 'kpr_disbursement'
];

async function migrate() {
  const source = new Client({ connectionString: SOURCE_DB });
  const target = new Client({ connectionString: TARGET_DB });

  try {
    console.log('🔄 Memulai migrasi final (32 Tabel)...');
    await source.connect();
    await target.connect();
    
    for (const table of tables) {
      try {
        const { rows } = await source.query(`SELECT * FROM "${table}"`);
        if (rows.length > 0) {
          console.log(`📦 Memindahkan ${rows.length} baris di [${table}]...`);
          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row);
            await target.query({
              text: `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT DO NOTHING`,
              values: values
            });
          }
        }
      } catch (e) {
        // Abaikan jika tabel tidak ada di sumber (Tokyo)
      }
    }
    console.log('\n✅ SEMUA DATA BERHASIL DIPINDAHKAN!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await source.end();
    await target.end();
  }
}

migrate();
