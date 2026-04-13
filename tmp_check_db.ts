import { pool, db } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'point_master'`);
    console.log("COLUMNS FOR point_master:", res.rows);
    
    const res2 = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'paket_master'`);
    console.log("COLUMNS FOR paket_master:", res2.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
