
import pg from "pg";

async function listTables() {
  const connectionString = "postgresql://postgres.yubjdtqcvbwevocfawib:vEBftPhnbrmYa6dz@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in 'public' schema:");
    for (const row of res.rows) {
      console.log("- " + row.table_name);
    }
  } catch (err) {
    console.error("List failed:", err);
  } finally {
    await pool.end();
  }
}

listTables();
