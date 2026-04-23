const pkg = require('pg');
const { Client } = pkg;

const TARGET_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const EMAIL = "luisdustin77@gmail.com";

async function fix() {
  const client = new Client({ connectionString: TARGET_DB });
  try {
    await client.connect();
    console.log(`Checking profile for ${EMAIL}...`);
    
    const { rows } = await client.query('SELECT * FROM profiles WHERE email = $1', [EMAIL]);
    
    if (rows.length === 0) {
      console.log('Profile not found! Creating admin profile...');
      await client.query(
        'INSERT INTO profiles (id, email, full_name, role) VALUES ($1, $2, $3, $4)',
        ['83a7c645-1234-4567-8901-234567890123', EMAIL, 'Luis Dustin', 'admin']
      );
      console.log('✅ Admin profile created.');
    } else {
      console.log('Profile found:', rows[0]);
      if (rows[0].role !== 'admin') {
        console.log('Updating role to admin...');
        await client.query('UPDATE profiles SET role = $1 WHERE email = $2', ['admin', EMAIL]);
        console.log('✅ Role updated to admin.');
      } else {
        console.log('✅ User is already admin.');
      }
    }

    // Also check for 'payments' table
    const { rows: tables } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments'");
    if (tables.length === 0) {
      console.log('Tabel [payments] belum ada. Membuat tabel...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sale_id UUID NOT NULL,
          installment_id UUID,
          amount DECIMAL(15,2) NOT NULL,
          payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
          payment_method TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('✅ Tabel [payments] berhasil dibuat.');
    } else {
      console.log('✅ Tabel [payments] sudah ada.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fix();
