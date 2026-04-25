
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const PROJECT_ID = '5a503672-1f3a-4b39-b7a7-e285a1870468'; // Golden Canyon

async function registerUnits() {
  const unitsToInsert = [];

  // Helper function to add range
  const addRange = (blok, start, end, type, lt, lb, price) => {
    for (let i = start; i <= end; i++) {
      const unitNum = i < 10 ? `0${i}` : `${i}`;
      unitsToInsert.push({
        project_id: PROJECT_ID,
        unit_number: `${blok} - ${unitNum}`,
        type: type,
        luas_tanah: lt,
        luas_bangunan: lb,
        price: price,
        status: 'available'
      });
    }
  };

  // --- RUKO GC ---
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'GC - 01', type: 'Grand', luas_tanah: 95, luas_bangunan: 125, price: 1470375000, status: 'available' });
  addRange('GC', 2, 17, 'Grand', 68, 125, 1331775000);
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'GC - 18', type: 'Grand', luas_tanah: 100, luas_bangunan: 125, price: 1496041667, status: 'available' });

  // --- EAST ---
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'East - 01', type: 'Copper 7', luas_tanah: 152, luas_bangunan: 160, price: 1788000000, status: 'available' });
  addRange('East', 2, 3, 'Copper 7', 105, 160, 1546733333);
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'East - 06', type: 'Black 8', luas_tanah: 120, luas_bangunan: 195, price: 1857300000, status: 'available' });

  // --- SOUTH ---
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'South - 03', type: 'Black 8', luas_tanah: 130, luas_bangunan: 195, price: 1908633333, status: 'available' });
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'South - 05', type: 'Black 8', luas_tanah: 129, luas_bangunan: 195, price: 1903500000, status: 'available' });
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'South - 06', type: 'Black 8', luas_tanah: 125, luas_bangunan: 195, price: 1882966667, status: 'available' });
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'South - 08', type: 'Copper 7', luas_tanah: 104, luas_bangunan: 160, price: 1541600000, status: 'available' });
  addRange('South', 10, 11, 'Copper 7', 105, 160, 1546733333); // Skip 09 because it's already in DB as SOLD
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'South - 12', type: 'Copper 7', luas_tanah: 89, luas_bangunan: 160, price: 1464600000, status: 'available' });
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'South - 14', type: 'Black 8', luas_tanah: 111, luas_bangunan: 195, price: 1811100000, status: 'available' });

  // --- NORTH ---
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'North - 01', type: 'Bronze 7', luas_tanah: 100, luas_bangunan: 125, price: 1287500000, status: 'available' });
  addRange('North', 2, 6, 'Onyx 6', 90, 105, 1102700000);
  addRange('North', 7, 10, 'Ruby 6', 90, 135, 1302900000);
  addRange('North', 14, 17, 'Copper 7', 105, 160, 1546733333);
  unitsToInsert.push({ project_id: PROJECT_ID, unit_number: 'North - 19', type: 'Black 8', luas_tanah: 166, luas_bangunan: 195, price: 2093433333, status: 'available' });

  console.log(`Menyiapkan pendaftaran ${unitsToInsert.length} unit ke Master...`);

  const { data, error } = await supabase.from('units').insert(unitsToInsert);

  if (error) {
    console.error('Gagal mendaftarkan unit:', error);
  } else {
    console.log(`--- BERHASIL MENDAFTARKAN ${unitsToInsert.length} UNIT ---`);
  }
}

registerUnits();
