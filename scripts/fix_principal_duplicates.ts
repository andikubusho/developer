import { db, pool } from "../server/db";
import { pelangganProgramPrincipal } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Checking for duplicates in pelanggan_program_principal...");
  
  // 1. Find duplicates
  const { rows: duplicates } = await pool.query(`
    SELECT pelanggan_id, program_principal_id, branch_id, COUNT(*) as count, MAX(id) as max_id
    FROM pelanggan_program_principal
    GROUP BY pelanggan_id, program_principal_id, branch_id
    HAVING COUNT(*) > 1;
  `);

  console.log(`Found ${duplicates.length} duplicate groups.`);

  if (duplicates.length > 0) {
    console.log("Deleting duplicates, keeping latest...");
    for (const dup of duplicates) {
      await pool.query(`
        DELETE FROM pelanggan_program_principal
        WHERE pelanggan_id = $1
          AND program_principal_id = $2
          AND branch_id = $3
          AND id != $4
      `, [dup.pelanggan_id, dup.program_principal_id, dup.branch_id, dup.max_id]);
    }
    console.log("Duplicates removed.");
  } else {
    console.log("No duplicates found.");
  }

  // 2. Add Unique constraint
  console.log("Adding unique constraint unique_pelanggan_program_principal...");
  try {
    // First remove it if it exists to replace it with the new name/structure
    await pool.query(`
        ALTER TABLE pelanggan_program_principal 
        DROP CONSTRAINT IF EXISTS unique_pelanggan_program_principal;
    `);
    await pool.query(`
        ALTER TABLE pelanggan_program_principal 
        DROP CONSTRAINT IF EXISTS pelanggan_program_principal_unq;
    `);
    
    await pool.query(`
      ALTER TABLE pelanggan_program_principal
      ADD CONSTRAINT unique_pelanggan_program_principal
      UNIQUE (pelanggan_id, program_principal_id, branch_id);
    `);
    console.log("Unique constraint added successfully.");
  } catch (err: any) {
    console.error("Error adding unique constraint:", err.message);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);
