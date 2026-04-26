const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSales() {
  const { data, error } = await supabase.from('sales').select('*').limit(1);
  if (error) {
    console.error('Error fetching sales:', error);
  } else {
    console.log('Sales structure:', data);
  }
}

checkSales();
