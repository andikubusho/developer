const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkPromos() {
  const { data, error } = await supabase.from('promos').select('*').limit(1);
  if (error) {
    console.error('Error fetching promos:', error);
  } else {
    console.log('Promos structure:', data);
  }
}

checkPromos();
