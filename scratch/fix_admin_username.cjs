const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function fixAdmin() {
  try {
    await client.connect();
    await client.query("UPDATE profiles SET email = 'admin_utama@internal.com', username = 'admin_utama' WHERE email = 'admin@internal.com' OR email = 'admin_utama@internal.com'");
    console.log('Username admin_utama berhasil disetel.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

fixAdmin();
