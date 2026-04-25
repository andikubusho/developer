const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const materials = [
  { name: 'Ember Cor (Maks. 28)', specification: 'TC-14 (Orange)', stock: 28, unit: 'Unit' },
  { name: 'Amplas', specification: '', stock: 15, unit: 'm' },
  { name: 'Benang Nylon', specification: '', stock: 25, unit: 'roll' },
  { name: 'Mata Potong Granite', specification: 'Aldo DWK 107', stock: 3, unit: 'Unit' },
  { name: 'Kawat Ayakan Pasir', specification: '', stock: 3, unit: 'm' },
  { name: 'Cat Pilox Merah', specification: 'Pylox', stock: 1, unit: 'klg' },
  { name: 'Lory Sorong', specification: '', stock: 1, unit: 'Unit' },
  { name: 'Batu Sikat Hitam Uk 1"', specification: '', stock: 6, unit: 'Karung' },
  { name: 'Thiner', specification: 'Cobra Merah', stock: 1, unit: 'galon' },
  { name: 'Cat Minyak', specification: 'Nippon / Avian', stock: 2, unit: 'klg' },
  { name: 'Cornisce', specification: '', stock: 10, unit: 'kg' },
  { name: 'AM 76 Bonding Agent', specification: '', stock: 1, unit: 'Liter' },
  { name: 'Ijuk', specification: '', stock: 1, unit: 'kg' },
  { name: 'Prostex 1L', specification: '', stock: 5, unit: 'btl' },
  { name: 'Sealeant Putih', specification: '', stock: 8, unit: 'tube' },
  { name: 'Seng Gelombang', specification: 'Lokal', stock: 5, unit: 'Lembar' },
  { name: 'Semen', specification: 'Tigaroda', stock: 818, unit: 'Sak' },
  { name: 'Pasir Beton dan Pasir Halus', specification: '', stock: 102, unit: 'm³' },
  { name: 'Pasir Urug', specification: '', stock: 20, unit: 'm³' },
  { name: 'Split 1/2', specification: '', stock: 35, unit: 'm³' },
  { name: 'Split 2/3', specification: '', stock: 1, unit: 'm³' },
  { name: 'Gelam 8/10', specification: '', stock: 1792, unit: 'Batang' },
  { name: 'Gelam 6/8', specification: '', stock: 6, unit: 'Batang' },
  { name: 'Besi Dia. 6', specification: '', stock: 4, unit: 'Batang' },
  { name: 'Besi Dia. 8', specification: 't. 7,2 atau t. 7,8', stock: 604, unit: 'Batang' },
  { name: 'Besi Dia. 10', specification: 't. 9,8 mm', stock: 456, unit: 'Batang' },
  { name: 'Besi Dia. 13', specification: 't. 12,7 mm', stock: 99, unit: 'Batang' },
  { name: 'Kawat Ikat', specification: '', stock: 182, unit: 'kg' },
  { name: 'Papan Racuk 25 x 2,5', specification: '25 cm x 2,5 cm P. 4 m (1m3 = 40 kpg)', stock: 1223, unit: 'Lembar' },
  { name: 'Papan Racuk 15 x 2,5', specification: '15 cm x 2,5 cm P. 4 m (1m3 = 67 kpg)', stock: 201, unit: 'Lembar' },
  { name: 'Hek 2/7 @4m', specification: '', stock: 60, unit: 'Lembar' },
  { name: 'Balok Kayu', specification: '12 cm x 6 cm P. 4m (1m3 = 35 btg)', stock: 1, unit: 'm³' },
  { name: 'Multiplek/ Plywood 4 mm', specification: '', stock: 69, unit: 'Lembar' },
  { name: 'Paku Kayu 1"', specification: '', stock: 3, unit: 'kg' },
  { name: 'Paku Kayu 2" (1 Dus = 20 kg)', specification: '', stock: 198, unit: 'kg' },
  { name: 'Paku Kayu 3" (1 Dus = 20 kg)', specification: '', stock: 40, unit: 'kg' },
  { name: 'Paku Kayu 4" (1 Dus = 20 kg)', specification: '', stock: 23, unit: 'kg' },
  { name: 'Ready Mix', specification: 'K-250', stock: 24, unit: 'm³' },
  { name: 'Paku Beton 1 1/2"', specification: '', stock: 1, unit: 'ktk' },
  { name: 'Paku Beton 2"', specification: '', stock: 17, unit: 'ktk' },
  { name: 'Paku Beton 3"', specification: '', stock: 10, unit: 'ktk' },
  { name: 'Plastik Cor (1 Roll = 47 m)', specification: '', stock: 1, unit: 'roll' },
  { name: 'Tanah Merah (TENTATIF)', specification: '', stock: 10, unit: 'Dumb' }
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
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ...mat,
          unit_price: 0,
          min_stock: 10
        })
      });
      console.log(`Inserted: ${mat.name} - Status: ${response.status}`);
    } catch (e) {
      console.error(`Failed: ${mat.name}`, e.message);
    }
  }
}

seed();
