const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function addUsernameColumn() {
  try {
    await client.connect();
    // 1. Tambah kolom username
    await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;");
    console.log('Kolom username berhasil ditambahkan.');

    // 2. Isi username dari email (ambil teks sebelum @)
    await client.query("UPDATE profiles SET username = split_part(email, '@', 1) WHERE username IS NULL;");
    
    // 3. Pastikan admin_utama terdaftar
    await client.query("UPDATE profiles SET email = 'admin_utama@internal.com', username = 'admin_utama' WHERE email = 'admin@internal.com' OR username = 'admin';");
    
    console.log('Data username berhasil diselaraskan.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

addUsernameColumn();
