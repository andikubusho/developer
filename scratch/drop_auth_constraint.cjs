const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function dropConstraint() {
  try {
    await client.connect();
    // 1. Hapus foreign key constraint yang mengikat ke auth.users
    await client.query("ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;");
    console.log('Tali pengikat (Foreign Key) berhasil dilepaskan.');
    
    // 2. Tambahan: Pastikan kolom ID tidak lagi bergantung pada sistem auth
    console.log('Sekarang tabel profiles sudah berdiri mandiri.');
  } catch (err) {
    console.error('Gagal melepas pengikat:', err.message);
  } finally {
    await client.end();
  }
}

dropConstraint();
