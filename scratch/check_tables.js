const SUPABASE_URL = 'https://krdcnrlruuurnwtiqmym.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZGNucmxydXV1cm53dGlxbXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjM2NzEsImV4cCI6MjA5MjQ5OTY3MX0.KRNpAGI9xd_-Z0VjQG022UNWFszns3zipZurovxs2VE';

async function checkTables() {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/?select=*`, {
      method: 'GET',
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const info = await resp.json();
    console.log('Available Tables:', info.definitions ? Object.keys(info.definitions) : 'No definitions found');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTables();
