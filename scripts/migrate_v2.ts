import pg from 'pg';
import "dotenv/config";

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  console.log("Connecting to database for migration...");
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected. Adding brand_code column...");
    await client.query("ALTER TABLE point_hadiah ADD COLUMN IF NOT EXISTS brand_code text NOT NULL DEFAULT 'SEMUA'");
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
