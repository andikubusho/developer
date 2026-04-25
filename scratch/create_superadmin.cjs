const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperAdmin() {
  const username = 'admin_utama';
  const password = 'admin123';
  const email = `${username}@internal.com`;

  console.log(`Sedang membuat user: ${username}...`);

  // 1. Sign up di Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Super Admin',
        username: username
      }
    }
  });

  if (authError) {
    console.error('Gagal di Supabase Auth:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`User Auth berhasil dibuat dengan ID: ${userId}`);

  // 2. Berikan Full Permissions (Admin)
  // Saya akan mengambil daftar menu dari schema jika memungkinkan, 
  // namun untuk seed ini saya akan hardcode akses dasar admin yang sangat luas.
  const fullPermissions = {};
  const menus = [
    'dashboard', 'leads', 'follow-ups', 'deposits', 'sales', 'promos', 'price-list', 
    'site-plan', 'floor-plan', 'marketing-schedule', 'marketing-master', 
    'projects', 'units', 'rab', 'construction-progress', 'materials', 
    'purchase-requests', 'spk', 'opname', 'real-cost', 'payments', 
    'kpr-disbursement', 'supplier-payments', 'cash-flow', 'petty-cash', 
    'general-journal', 'ledger', 'financial-reports', 'taxation', 
    'employees', 'attendance', 'payroll', 'recruitment', 
    'audit-transactions', 'audit-stock', 'audit-costs', 'user-management'
  ];

  menus.forEach(menu => {
    fullPermissions[menu] = { view: true, create: true, edit: true, delete: true, print: true };
  });

  // 3. Insert ke profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: 'Super Admin',
      email: email, // Simpan identitas dummy di kolom email
      role: 'admin',
      permissions: fullPermissions
    });

  if (profileError) {
    console.error('Gagal membuat profile:', profileError.message);
    console.log('Catatan: Jika user auth sudah ada tapi profile gagal, Anda mungkin perlu menghapus user di dashboard Supabase dulu.');
  } else {
    console.log('--------------------------------------------------');
    console.log('SUKSES! Akun Superadmin berhasil dibuat.');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('--------------------------------------------------');
    console.log('Silakan login di halaman login aplikasi.');
  }
}

createSuperAdmin();
