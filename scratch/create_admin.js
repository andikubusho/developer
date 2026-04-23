import { createClient } from '@supabase/supabase-js';

// KONFIGURASI SINGAPORE
const SUPABASE_URL = 'https://krdcnrlruuurnwtiqmym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZGNucmxydXV1cm53dGlxbXltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjkyMzY3MSwiZXhwIjoyMDkyNDk5NjcxfQ.kJ12711wPnCuvrR90bPeq3BUZbtXnodl6gN8UDveZYg'; 

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log('🚀 Mencoba membuat User Administrator...');

  const email = 'luisdustin77@gmail.com';
  const password = 'password123'; 

  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('ℹ️ Email sudah ada, mencoba update role ke Admin...');
      // Update role jika user sudah ada
      const users = await supabase.auth.admin.listUsers();
      const user = users.data.users.find(u => u.email === email);
      if (user) {
        await supabase.from('profiles').upsert({ id: user.id, role: 'admin', full_name: 'Administrator', email: email });
        console.log('✅ Role berhasil diupdate ke Admin!');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  } else {
    await supabase.from('profiles').upsert({ id: data.user.id, role: 'admin', full_name: 'Administrator', email: email });
    console.log('✅ User Admin berhasil dibuat!');
  }
}

createAdmin();
