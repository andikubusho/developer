const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function dropSalesColumns() {
  try {
    await client.connect();
    // Hapus kolom yang tidak diperlukan lagi di tabel sales
    await client.query("ALTER TABLE sales DROP COLUMN IF EXISTS identity_number;");
    await client.query("ALTER TABLE sales DROP COLUMN IF EXISTS job;");
    await client.query("ALTER TABLE sales DROP COLUMN IF EXISTS birth_info;");
    console.log('Kolom NIK, Pekerjaan, dan TTL berhasil dihapus dari tabel SALES.');
  } catch (err) {
    console.error('Gagal menghapus kolom:', err.message);
  } finally {
    await client.end();
  }
}

dropSalesColumns();
