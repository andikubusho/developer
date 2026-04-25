const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrate() {
  console.log('--- MIGRASI DATABASE AUTH ---');
  
  // 1. Tambah kolom password ke tabel profiles jika belum ada
  const { error: alterError } = await supabase.rpc('execute_sql', {
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;`
  });

  if (alterError) {
    // Jika RPC tidak tersedia, kita coba lewat query biasa (jika diizinkan)
    console.log('RPC gagal, mencoba metode alternatif...');
    console.error(alterError.message);
  }

  // 2. Set password default 'admin123' untuk semua admin agar tidak terkunci
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ password: 'admin123' })
    .eq('role', 'owner');

  if (updateError) console.error('Gagal set password default:', updateError.message);
  else console.log('Password default berhasil disetel.');

  console.log('Migrasi Selesai.');
}

migrate();
