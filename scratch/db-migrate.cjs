const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    console.log("Migrating database...");
    await client.query("ALTER TABLE units ADD COLUMN IF NOT EXISTS sp_width float4;");
    await client.query("ALTER TABLE units ADD COLUMN IF NOT EXISTS sp_height float4;");
    await client.query("ALTER TABLE units ADD CONSTRAINT units_project_id_unit_number_key UNIQUE (project_id, unit_number);");
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
