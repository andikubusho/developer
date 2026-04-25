const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Menggunakan Anon Key (Terbatas)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStatus() {
  console.log('--- STATUS KONEKSI ---');
  console.log('URL:', process.env.VITE_SUPABASE_URL);
  
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Koneksi Gagal:', error.message);
    console.log('SARAN: Pastikan di Dashboard Supabase, "Email Provider" dalam keadaan ENABLED.');
  } else {
    console.log('Koneksi Berhasil! Database terhubung.');
  }
}

checkStatus();
