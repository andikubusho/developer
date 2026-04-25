const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const materials = [
  { name: 'Ember Cor (Maks. 28)', specification: 'TC-14 (Orange)', stock: 28, unit: 'Unit' }
];

async function seed() {
  const url = `${SUPABASE_URL}/rest/v1/materials`;
  for (const mat of materials) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          ...mat,
          unit_price: 0,
          min_stock: 10
        })
      });
      const data = await response.json();
      console.log(`Inserted: ${mat.name} - Status: ${response.status}`, data);
    } catch (e) {
      console.error(`Failed: ${mat.name}`, e.message);
    }
  }
}

seed();
