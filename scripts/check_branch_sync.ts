// @ts-nocheck
import { db } from './server/db.ts';
import { users, branches, paketMaster } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("=== CHECKING USERS ===");
  const allUsers = await db.select({ id: users.id, username: users.username, branchId: users.branchId }).from(users);
  console.log(JSON.stringify(allUsers, null, 2));

  console.log("\n=== CHECKING BRANCHES ===");
  const allBranches = await db.select().from(branches);
  console.log(JSON.stringify(allBranches, null, 2));

  console.log("\n=== CHECKING PAKET MASTER ===");
  const allPakets = await db.select({ id: paketMaster.id, nama: paketMaster.nama, branchId: paketMaster.branchId }).from(paketMaster);
  console.log(JSON.stringify(allPakets, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
