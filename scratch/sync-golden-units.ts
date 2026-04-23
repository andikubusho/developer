
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const PROJECT_ID = '28680951-0ab9-4722-a58c-6436a9401e42';

async function syncUnits() {
  try {
    const result = await db.execute(sql`
      SELECT id, project_id, unit_id, blok, unit, tipe, luas_tanah, luas_bangunan, harga_jual, status 
      FROM price_list_items 
      WHERE project_id = ${PROJECT_ID}
    `);
    
    console.log(`Syncing ${result.rows.length} units to units table...`);
    
    for (const row of result.rows) {
      const unitNumber = `${row.blok}/${row.unit}`;
      await db.execute(sql`
        INSERT INTO units (id, project_id, unit_number, type, price, status)
        VALUES (${row.id}, ${PROJECT_ID}, ${unitNumber}, ${row.tipe}, ${row.harga_jual}, ${row.status === 'sold' ? 'sold' : 'available'})
        ON CONFLICT (id) DO UPDATE SET
          unit_number = EXCLUDED.unit_number,
          type = EXCLUDED.type,
          price = EXCLUDED.price,
          status = EXCLUDED.status
      `);
    }
    console.log("✅ Units table synchronized.");
  } catch (error) {
    console.error("❌ Error syncing units:", error);
  }
  process.exit(0);
}

syncUnits();
