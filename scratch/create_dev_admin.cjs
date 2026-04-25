const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function createDevAdmin() {
  const username = 'admin_dev';
  const email = `${username}@internal.com`;
  const password = 'admin123';

  console.log(`Mencoba mendaftarkan user baru: ${username} (${email})...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Developer Admin',
        role: 'admin'
      }
    }
  });

  if (error) {
    console.error('Gagal mendaftar:', error.message);
  } else {
    console.log('Pendaftaran BERHASIL!');
    console.log('Silakan login dengan:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    
    // Injected into profiles if trigger didn't catch it
    const userId = data.user.id;
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: 'Developer Admin',
        role: 'admin'
      });
      
    if (profileError) console.error('Gagal update profil:', profileError.message);
    else console.log('Profil berhasil diperbarui sebagai admin.');
  }
}

createDevAdmin();
