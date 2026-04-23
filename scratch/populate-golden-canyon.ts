
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const PROJECT_ID = '28680951-0ab9-4722-a58c-6436a9401e42';

async function insertData() {
  const items = [
    // Ruko
    { category: 'Ruko', cluster: 'GC', blok: 'GC', unit: '01', tipe: 'Grand', lt: 95, lb: 125, hj: 1470375000, bf: 15000000, dp: 0.20, status: 'available' },
    ...Array.from({ length: 16 }, (_, i) => ({
      category: 'Ruko', cluster: 'GC', blok: 'GC', unit: (i + 2).toString().padStart(2, '0'), tipe: 'Grand', lt: 68, lb: 125, hj: 1331775000, bf: 15000000, dp: 0.20, status: 'available'
    })),
    { category: 'Ruko', cluster: 'GC', blok: 'GC', unit: '18', tipe: 'Grand', lt: 100, lb: 125, hj: 1496041667, bf: 15000000, dp: 0.20, status: 'available' },

    // Rumah - East
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '01', tipe: 'Copper 7', lt: 152, lb: 160, hj: 1788000000, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '02', tipe: 'Copper 7', lt: 105, lb: 160, hj: 1546733333, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '03', tipe: 'Copper 7', lt: 105, lb: 160, hj: 1546733333, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '05', tipe: 'Copper 7', lt: 105, lb: 160, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '06', tipe: 'Black 8', lt: 120, lb: 195, hj: 1857300000, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '07', tipe: 'Black 8', lt: 120, lb: 195, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '08', tipe: 'Black 8', lt: 120, lb: 195, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'East', blok: 'East', unit: '09', tipe: 'Black 8', lt: 141, lb: 195, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },

    // Rumah - South
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '02', tipe: 'Black 8', lt: 126, lb: 195, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '03', tipe: 'Black 8', lt: 130, lb: 195, hj: 1908633333, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '05', tipe: 'Black 8', lt: 129, lb: 195, hj: 1903500000, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '06', tipe: 'Black 8', lt: 125, lb: 195, hj: 1882966667, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '07', tipe: 'Copper 7', lt: 106, lb: 160, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '08', tipe: 'Copper 7', lt: 104, lb: 160, hj: 1541600000, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '09', tipe: 'Copper 7', lt: 105, lb: 160, hj: 1546733333, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '10', tipe: 'Copper 7', lt: 105, lb: 160, hj: 1546733333, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '11', tipe: 'Copper 7', lt: 105, lb: 160, hj: 1546733333, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '12', tipe: 'Copper 7', lt: 89, lb: 160, hj: 1464600000, bf: 15000000, dp: 0.10, status: 'available' },
    { category: 'Rumah', cluster: 'South', blok: 'South', unit: '14', tipe: 'Black 8', lt: 111, lb: 195, hj: 1811100000, bf: 15000000, dp: 0.10, status: 'available' },

    // Rumah - North
    { category: 'Rumah', cluster: 'North', blok: 'North', unit: '01', tipe: 'Bronze 7', lt: 100, lb: 125, hj: 1287500000, bf: 15000000, dp: 0.10, status: 'available' },
    ...Array.from({ length: 5 }, (_, i) => ({
      category: 'Rumah', cluster: 'North', blok: 'North', unit: (i + 2).toString().padStart(2, '0'), tipe: 'Onyx 6', lt: 90, lb: 105, hj: 1102700000, bf: 15000000, dp: 0.10, status: 'available'
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      category: 'Rumah', cluster: 'North', blok: 'North', unit: (i + 7).toString().padStart(2, '0'), tipe: 'Ruby 6', lt: 90, lb: 135, hj: 1302900000, bf: 15000000, dp: 0.10, status: 'available'
    })),
    { category: 'Rumah', cluster: 'North', blok: 'North', unit: '11', tipe: 'Ruby 6', lt: 90, lb: 135, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'North', blok: 'North', unit: '12', tipe: 'Copper 7', lt: 138, lb: 160, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    ...Array.from({ length: 4 }, (_, i) => ({
      category: 'Rumah', cluster: 'North', blok: 'North', unit: (i + 14).toString().padStart(2, '0'), tipe: 'Copper 7', lt: 105, lb: 160, hj: 1546733333, bf: 15000000, dp: 0.10, status: 'available'
    })),
    { category: 'Rumah', cluster: 'North', blok: 'North', unit: '18', tipe: 'Copper 7', lt: 105, lb: 160, hj: 0, bf: 15000000, dp: 0.10, status: 'sold' },
    { category: 'Rumah', cluster: 'North', blok: 'North', unit: '19', tipe: 'Black 8', lt: 166, lb: 195, hj: 2093433333, bf: 15000000, dp: 0.10, status: 'available' },
  ];

  try {
    for (const item of items) {
      await db.execute(sql`
        INSERT INTO price_list_items (
          project_id, unit_id, category, cluster, blok, unit, tipe, 
          luas_tanah, luas_bangunan, harga_jual, booking_fee, dp_percentage, status
        ) VALUES (
          ${PROJECT_ID}, 
          ${`unit-${item.blok.toLowerCase()}-${item.unit}`}, 
          ${item.category}, 
          ${item.cluster}, 
          ${item.blok}, 
          ${item.unit}, 
          ${item.tipe}, 
          ${item.lt}, 
          ${item.lb}, 
          ${item.hj}, 
          ${item.bf}, 
          ${item.dp}, 
          ${item.status}
        )
      `);
    }
    console.log(`✅ Successfully inserted ${items.length} units.`);
  } catch (error) {
    console.error("❌ Error inserting data:", error);
  }
  process.exit(0);
}

insertData();
