
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function listProjects() {
  try {
    const result = await db.execute(sql`
      SELECT id, name FROM projects
    `);
    console.log("Existing Projects:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error listing projects:", error);
  }
  process.exit(0);
}

listProjects();
