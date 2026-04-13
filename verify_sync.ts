import { db } from "./server/db";
import { users, branches } from "./shared/schema";
import { eq } from "drizzle-orm";

async function verify() {
  try {
    const uList = await db.select().from(users);
    const bList = await db.select().from(branches);
    
    console.log("--- USERS ---");
    uList.forEach(u => {
      console.log(`ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, BranchId: ${u.branchId}, Hash: ${u.password.substring(0, 10)}...`);
    });
    
    console.log("\n--- BRANCHES ---");
    bList.forEach(b => {
      console.log(`ID: ${b.id}, Name: ${b.name}`);
    });
  } catch (err) {
    console.error("Verification failed:", err);
  }
  process.exit(0);
}

verify();
