const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL
});

async function addBankFKey() {
  console.log('Menghubungkan tabel payments ke bank_accounts...');
  try {
    await client.connect();
    console.log('Terhubung ke PostgreSQL.');

    // Tambahkan Foreign Key Constraint
    await client.query(`
      ALTER TABLE payments 
      ADD CONSTRAINT fk_payments_bank_accounts 
      FOREIGN KEY (bank_account_id) 
      REFERENCES bank_accounts(id) 
      ON DELETE SET NULL;
    `);

    console.log('Relationship berhasil dibuat.');

  } catch (err) {
    console.error('Error migrasi:', err.message);
  } finally {
    await client.end();
    console.log('Koneksi ditutup.');
  }
}

addBankFKey();
