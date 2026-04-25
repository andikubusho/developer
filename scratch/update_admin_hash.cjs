const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function updateHash() {
  const hashedPassword = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  try {
    await client.connect();
    await client.query("UPDATE profiles SET password = $1 WHERE email LIKE 'admin_%'", [hashedPassword]);
    console.log('Update Hash Berhasil untuk admin.');
  } catch (err) {
    console.error('Gagal update hash:', err.message);
  } finally {
    await client.end();
  }
}

updateHash();
