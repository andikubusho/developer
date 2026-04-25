const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  console.log('--- MIGRASI DATABASE LANGSUNG ---');
  try {
    await client.connect();
    console.log('Terhubung ke PostgreSQL.');

    // 1. Tambah kolom password
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;`);
    console.log('Kolom password berhasil ditambahkan.');

    // 2. Set password default untuk admin_utama dan admin_dev
    await client.query(`UPDATE profiles SET password = 'admin123' WHERE email LIKE 'admin_%';`);
    console.log('Password default berhasil disetel untuk admin.');

  } catch (err) {
    console.error('Error migrasi:', err.message);
  } finally {
    await client.end();
    console.log('Koneksi ditutup.');
  }
}

migrate();
