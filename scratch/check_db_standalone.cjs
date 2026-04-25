const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function check() {
  const url = `${SUPABASE_URL}/rest/v1/users?limit=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Data:', data);
  } catch (e) {
    console.log('Error:', e.message);
  }
}
check();
