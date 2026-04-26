const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSalesColumns() {
  // Querying a non-existent column to trigger an error that lists valid columns, 
  // or using the RPC if available. 
  // Another way: select * from sales where false.
  const { data, error, status } = await supabase.from('sales').select('*').limit(0);
  if (error) {
    console.error('Error:', error);
  } else {
    // If successful but empty, we can't see columns easily from 'data'.
    // We'll try to insert a dummy row and see the error or check the response header.
    console.log('Success, but no data to show columns.');
    
    // Attempting to see what's in the response by selecting one row if it exists
    const { data: data2 } = await supabase.from('sales').select('*').limit(1);
    if (data2 && data2.length > 0) {
      console.log('Columns found:', Object.keys(data2[0]));
    } else {
       console.log('Table is empty, trying to trigger column list via error...');
       const { error: error2 } = await supabase.from('sales').select('non_existent_column');
       console.log('Error hint:', error2?.message);
    }
  }
}

checkSalesColumns();
