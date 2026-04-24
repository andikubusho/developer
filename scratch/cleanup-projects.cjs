const { Client } = require('pg');
require('dotenv').config();

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    console.log("Starting database cleanup...");

    // IDs from previous query
    const oldId = '28680951-0ab9-4722-a58c-6436a9401e42'; // 'golden canyon' (lowercase)
    const newId = '5a503672-1f3a-4b39-b7a7-e285a1870468'; // 'Golden Canyon' (Capitalized)

    // 1. Move units
    const moveUnits = await client.query(
      "UPDATE units SET project_id = $1 WHERE project_id = $2",
      [newId, oldId]
    );
    console.log(`Moved ${moveUnits.rowCount} units from old project to new project.`);

    // 1.5 Move price_list_items
    const movePricelist = await client.query(
      "UPDATE price_list_items SET project_id = $1 WHERE project_id = $2",
      [newId, oldId]
    );
    console.log(`Moved ${movePricelist.rowCount} price list items.`);

    // 2. Delete old project
    const deleteProject = await client.query(
      "DELETE FROM projects WHERE id = $1",
      [oldId]
    );
    console.log(`Deleted duplicate project: ${oldId}`);

    console.log("Cleanup finished successfully!");
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    await client.end();
  }
}

cleanup();
