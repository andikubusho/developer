const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listAllTables() {
  const { data, error } = await supabase.rpc('get_tables'); // unlikely to work unless defined
  if (error) {
     // fallback to a generic query
     const { data: data2, error: error2 } = await supabase.from('sales').select('*').limit(1);
     if (data2 && data2.length > 0) {
       console.log('Sales row:', data2[0]);
     } else {
       console.log('No rows in sales. Trying to get columns via a known trick...');
       // Trying to insert a record with many missing columns to see if it lists them
       const { error: error3 } = await supabase.from('sales').insert({ xxxx: 'yyyy' });
       console.log('Insert error message:', error3?.message);
     }
  } else {
    console.log('Tables:', data);
  }
}

listAllTables();
