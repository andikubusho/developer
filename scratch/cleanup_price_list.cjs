
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanupData() {
  console.log('--- MEMULAI PEMBERSIHAN DATA ---');
  
  // 1. Ambil semua ID Unit yang valid
  const { data: units } = await supabase.from('units').select('id');
  const validUnitIds = new Set((units || []).map(u => u.id));
  console.log(`Ditemukan ${validUnitIds.size} unit valid di Master Unit.`);

  // 2. Ambil semua data di Price List
  const { data: pli } = await supabase.from('price_list_items').select('id, unit_id, blok, unit');
  
  // 3. Identifikasi data yatim (tidak ada unit_id-nya di tabel units)
  const orphans = (pli || []).filter(item => !item.unit_id || !validUnitIds.has(item.unit_id));
  
  console.log(`Ditemukan ${orphans.length} data yatim di Price List.`);
  orphans.forEach(o => console.log(`- Menghapus: ${o.blok} ${o.unit} (ID: ${o.id})`));

  if (orphans.length > 0) {
    const orphanIds = orphans.map(o => o.id);
    const { error } = await supabase.from('price_list_items').delete().in('id', orphanIds);
    
    if (error) {
      console.error('Gagal menghapus data:', error);
    } else {
      console.log('--- BERHASIL MENGHAPUS DATA YATIM ---');
    }
  } else {
    console.log('Tidak ada data yang perlu dihapus.');
  }
}

cleanupData();
