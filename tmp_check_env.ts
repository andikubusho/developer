
import { db } from "./server/db.js";
import { promoBrands, users, branches } from "./shared/schema.js";

async function check() {
  const brands = await db.select().from(promoBrands);
  console.log("Registered Brands:");
  console.table(brands);

  const allUsers = await db.select().from(users);
  console.log("Users and their Branches:");
  console.table(allUsers.map(u => ({ id: u.id, username: u.username, branchId: u.branchId })));

  const allBranches = await db.select().from(branches);
  console.log("All Branches:");
  console.table(allBranches);
}

check().catch(console.error).finally(() => process.exit(0));
